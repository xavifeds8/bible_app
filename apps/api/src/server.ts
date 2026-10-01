import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { loadEnv, DB_PATH, ROOT } from "@bible/config";
import { SqliteStore } from "@bible/db";
import { DeepSeekLLM, MockLLM, type LLM } from "@bible/llm";
import { handleCheckin } from "@bible/checkin";

loadEnv();

const PORT = Number(process.env.PORT ?? 8787);
const MAX_BODY_BYTES = 10_000;
const MAX_TEXT_CHARS = 2_000;

// Fast local macOS `say` voice for English; edge-tts for Hindi/Kannada (+ fallback).
const SAY_BIN = process.env.TTS_SAY_BIN ?? "/usr/bin/say";
const SAY_ENABLED = process.env.TTS_SAY !== "0" && existsSync(SAY_BIN);
const SAY_VOICE_EN = process.env.TTS_SAY_VOICE ?? "Daniel";
const SAY_RATE_EN = Number(process.env.TTS_SAY_RATE ?? 155);

const TTS_PYTHON = process.env.EDGE_TTS_PYTHON ?? resolve(ROOT, "apps/pipeline/.venv/bin/python");
const TTS_WORKER_SCRIPT = resolve(ROOT, "apps/pipeline/scripts/tts_worker.py");
const VOICES: Record<string, { voice: string; rate: string; pitch: string }> = {
  en: { voice: process.env.TTS_VOICE_EN ?? "en-US-AndrewNeural", rate: "-8%", pitch: "-2Hz" },
  hi: { voice: process.env.TTS_VOICE_HI ?? "hi-IN-SwaraNeural", rate: "-6%", pitch: "-1Hz" },
  kn: { voice: process.env.TTS_VOICE_KN ?? "kn-IN-SapnaNeural", rate: "-6%", pitch: "-1Hz" },
};

const TTS_CACHE = resolve(ROOT, "data/cache/tts");
mkdirSync(TTS_CACHE, { recursive: true });

const store = new SqliteStore(DB_PATH);
const llm: LLM = process.env.DEEPSEEK_API_KEY
  ? new DeepSeekLLM({ apiKey: process.env.DEEPSEEK_API_KEY })
  : new MockLLM();

function json(res: ServerResponse, status: number, body: unknown) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(data);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

interface TtsJob {
  text: string;
  lang: string;
  res: ServerResponse;
  started: boolean;
}

let ttsWorker: ChildProcess | null = null;
const ttsQueue: TtsJob[] = [];

function finishJob(ok: boolean) {
  const job = ttsQueue.shift();
  if (job && !ok && !job.res.writableEnded) {
    if (job.started) job.res.end();
    else json(job.res, 502, { error: "tts failed" });
  }
  if (ttsQueue.length > 0) pumpTts();
}

function pumpTts() {
  const job = ttsQueue[0];
  if (!job) return;
  const worker = ensureTtsWorker();
  const cfg = VOICES[job.lang];
  worker.stdin?.write(
    JSON.stringify({ voice: cfg.voice, rate: cfg.rate, pitch: cfg.pitch, text: job.text }) + "\n"
  );
}

function ensureTtsWorker(): ChildProcess {
  if (ttsWorker && !ttsWorker.killed) return ttsWorker;
  const child = spawn(TTS_PYTHON, [TTS_WORKER_SCRIPT], { stdio: ["pipe", "pipe", "pipe"] });
  const rl = createInterface({ input: child.stdout! });
  rl.on("line", (line) => {
    const job = ttsQueue[0];
    if (!job) return;
    let msg: { a?: string; end?: boolean; error?: string };
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.a) {
      if (!job.res.writableEnded) {
        if (!job.started) {
          job.started = true;
          job.res.writeHead(200, {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          });
        }
        job.res.write(Buffer.from(msg.a, "base64"));
      }
    } else if (msg.end) {
      if (!job.res.writableEnded) job.res.end();
      finishJob(true);
    } else if (msg.error) {
      console.error("tts worker error:", msg.error);
      finishJob(false);
    }
  });
  child.stderr.on("data", (d: Buffer) => console.error("tts worker:", d.toString().trim()));
  child.on("exit", () => {
    ttsWorker = null;
    if (ttsQueue.length > 0) finishJob(false);
  });
  child.on("error", (e) => {
    console.error("tts worker spawn error:", e);
    ttsWorker = null;
    finishJob(false);
  });
  ttsWorker = child;
  return child;
}

/** Queue an edge-tts request onto the warm worker. */
function streamEdgeTts(res: ServerResponse, text: string, lang: string) {
  ttsQueue.push({ text, lang, res, started: false });
  if (ttsQueue.length === 1) pumpTts();
}

/** Prime the worker + network connection at boot so the first user request is fast. */
function warmupTts() {
  let done = false;
  const sink = {
    get writableEnded() {
      return done;
    },
    writeHead() {},
    write() {
      return true;
    },
    end() {
      done = true;
      console.log("tts worker warmed");
    },
  } as unknown as ServerResponse;
  ttsQueue.push({ text: "Ready.", lang: "en", res: sink, started: false });
  if (ttsQueue.length === 1) pumpTts();
}


/** Fast local macOS voice → WAV file. */
function synthesizeSay(text: string, outPath: string, done: (ok: boolean) => void) {
  const tmp = `${outPath}.${process.pid}.${Date.now()}.wav`;
  const child = spawn(
    SAY_BIN,
    ["-v", SAY_VOICE_EN, "-r", String(SAY_RATE_EN), "--data-format=LEI16@22050", "-o", tmp],
    { stdio: ["pipe", "ignore", "pipe"] }
  );
  const finish = (ok: boolean) => {
    if (ok) {
      try {
        renameSync(tmp, outPath);
      } catch {
        done(false);
        return;
      }
    } else {
      try {
        unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
    done(ok);
  };
  child.on("error", (e) => {
    console.error("say error:", e);
    finish(false);
  });
  child.stderr.on("data", (d: Buffer) => console.error("say stderr:", d.toString().trim()));
  child.on("close", (code) => finish(code === 0));
  child.stdin.end(text);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true, llm: process.env.DEEPSEEK_API_KEY ? "deepseek" : "mock" });
    return;
  }

  // TTS: fast local voice (cached), edge-tts for other languages / fallback.
  if (req.method === "GET" && url.pathname === "/api/tts") {
    const text = (url.searchParams.get("text") ?? "").trim();
    const requested = url.searchParams.get("lang") ?? "en";
    const lang = ["en", "hi", "kn"].includes(requested) ? requested : "en";
    if (!text) {
      json(res, 400, { error: "text is required" });
      return;
    }
    if (text.length > 1000) {
      json(res, 400, { error: "text too long" });
      return;
    }

    const useSay = lang === "en" && SAY_ENABLED;
    const provider = useSay ? "say" : "edge";
    const ext = useSay ? "wav" : "mp3";
    const type = useSay ? "audio/wav" : "audio/mpeg";
    const voiceKey = useSay
      ? `${SAY_VOICE_EN}|${SAY_RATE_EN}`
      : `${VOICES[lang].voice}|${VOICES[lang].rate}|${VOICES[lang].pitch}`;
    const key = createHash("sha1").update(`${provider}|${lang}|${voiceKey}|${text}`).digest("hex");
    const cachePath = join(TTS_CACHE, `${key}.${ext}`);

    const serveFile = (p: string) => {
      res.writeHead(200, {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      });
      const rs = createReadStream(p);
      rs.on("error", () => {
        if (!res.writableEnded) res.end();
      });
      rs.pipe(res);
    };

    if (existsSync(cachePath)) {
      serveFile(cachePath);
      return;
    }
    if (useSay) {
      synthesizeSay(text, cachePath, (ok) => {
        if (ok) serveFile(cachePath);
        else streamEdgeTts(res, text, lang);
      });
    } else {
      streamEdgeTts(res, text, lang);
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/checkin") {
    try {
      const raw = await readBody(req);
      let body: { text?: string; language?: string };
      try {
        body = JSON.parse(raw);
      } catch {
        json(res, 400, { error: "invalid JSON body" });
        return;
      }
      const text = String(body.text ?? "").trim();
      const language = ["en", "hi", "kn"].includes(body.language ?? "") ? (body.language as "en" | "hi" | "kn") : "en";
      if (!text) {
        json(res, 400, { error: "text is required" });
        return;
      }
      if (text.length > MAX_TEXT_CHARS) {
        json(res, 400, { error: "text too long" });
        return;
      }

      const result = await handleCheckin(text, store, llm, language);
      json(res, 200, result);
    } catch (e) {
      console.error("checkin error:", e);
      json(res, 500, { error: "internal error" });
    }
    return;
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`Bible API listening on http://localhost:${PORT}`);
  console.log(`LLM: ${process.env.DEEPSEEK_API_KEY ? "deepseek" : "mock (no DEEPSEEK_API_KEY)"}`);
  warmupTts();
});
