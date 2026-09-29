import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadEnv, DB_PATH } from "@bible/config";
import { SqliteStore } from "@bible/db";
import { DeepSeekLLM, MockLLM, type LLM } from "@bible/llm";
import { handleCheckin } from "@bible/checkin";

loadEnv();

const PORT = Number(process.env.PORT ?? 8787);
const MAX_BODY_BYTES = 10_000;
const MAX_TEXT_CHARS = 2_000;

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

  if (req.method === "POST" && url.pathname === "/api/checkin") {
    try {
      const raw = await readBody(req);
      let text = "";
      try {
        text = String(JSON.parse(raw).text ?? "").trim();
      } catch {
        json(res, 400, { error: "invalid JSON body" });
        return;
      }
      if (!text) {
        json(res, 400, { error: "text is required" });
        return;
      }
      if (text.length > MAX_TEXT_CHARS) {
        json(res, 400, { error: "text too long" });
        return;
      }

      const result = await handleCheckin(text, store, llm);
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
});
