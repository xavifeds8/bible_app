import { mkdirSync, writeFileSync } from "node:fs";
import { DeepSeekLLM, MockLLM, type LLM } from "@bible/llm";
import { SqliteStore, type Reel, type ReelKind } from "@bible/db";
import { loadEnv, DB_PATH, WORK_DIR, RAW_DIR, PRIMARY_TRANSLATION } from "./config.js";
import { SEED_PASSAGES, buildPassages } from "./passages.js";
import { EMOTIONS } from "./emotions.js";
import { SEED_DENYLIST, filterPassages } from "./filter.js";
import { draftValidated } from "@bible/content";
import { publish } from "./publish.js";
import { ingestWeb } from "./usfm.js";

loadEnv();

function getLLM(): LLM {
  if (process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekLLM({ apiKey: process.env.DEEPSEEK_API_KEY });
  }
  console.warn("⚠️  DEEPSEEK_API_KEY not set — using MockLLM (placeholder drafts).");
  return new MockLLM();
}

function store(): SqliteStore {
  return new SqliteStore(DB_PATH);
}

/** Ingest WEB (World English Bible) USFM files from eBible.org. */
function ingestWebCmd() {
  const s = store();
  const verses = ingestWeb(RAW_DIR, "WEB");
  s.insertVerses(verses);
  console.log(`Ingested ${verses.length} WEB verses.`);
  console.log(`Total verses in DB: ${s.listVerses().length}`);
}

/** Build passages, apply denylist + context filter per emotion, and report candidates. */
function curate() {
  const s = store();
  s.insertDenylist(SEED_DENYLIST);
  const passages = buildPassages(s, SEED_PASSAGES, PRIMARY_TRANSLATION as "WEB" | "KJV");
  s.insertPassages(passages);
  console.log(`Loaded ${passages.length} passages into DB.`);

  const denylist = s.listDenylist();
  const report: Record<string, string[]> = {};

  for (const emotion of EMOTIONS) {
    const candidates = passages.filter((p) => emotion.seedPassages.includes(p.id));
    const { kept, dropped } = filterPassages(candidates, emotion.tag, denylist);
    report[emotion.tag] = kept.map((p) => p.id);
    console.log(
      `\n[${emotion.tag}] ${emotion.label}: ${kept.length} kept` +
        (dropped.length ? ` (${dropped.length} dropped: ${dropped.map((d) => d.passageId).join(", ")})` : "")
    );
  }

  const story = passages.filter((p) => p.type === "story");
  console.log(`\n[stories] ${story.length} story passages`);

  mkdirSync(WORK_DIR, { recursive: true });
  writeFileSync(`${WORK_DIR}/candidates.json`, JSON.stringify(report, null, 2));
  console.log(`\nCandidate map written to ${WORK_DIR}/candidates.json`);
}

/** Draft + validate reels for every (emotion, passage) candidate and every story. */
async function draft() {
  const s = store();
  const llm = getLLM();
  const passages = s.listPassages();
  const denylist = s.listDenylist();

  const drafts: Reel[] = [];
  let n = 0;
  let failed = 0;

  // Emotion reels
  for (const emotion of EMOTIONS) {
    const candidates = passages.filter((p) => emotion.seedPassages.includes(p.id));
    const { kept } = filterPassages(candidates, emotion.tag, denylist);
    for (const passage of kept) {
      n++;
      try {
        const { draft: d, validation: v } = await draftValidated(llm, passage, "emotion", [emotion.tag]);
        drafts.push({
          id: `${passage.id}--${emotion.tag}`,
          kind: "emotion",
          emotionTags: [emotion.tag],
          passageId: passage.id,
          hook: d.hook,
          reflection: d.reflection,
          prayer: d.prayer,
          status: "draft",
          version: 1,
        });
        if (!v.ok) {
          console.warn(`⚠️  ${passage.id}/${emotion.tag}: ${v.errors.join("; ")}`);
        }
      } catch (e) {
        failed++;
        console.error(`✗ ${passage.id}/${emotion.tag}: ${(e as Error).message}`);
      }
    }
  }

  // Story reels
  for (const passage of passages.filter((p) => p.type === "story")) {
    n++;
    try {
      const { draft: d, validation: v } = await draftValidated(llm, passage, "story", []);
      drafts.push({
        id: `${passage.id}--story`,
        kind: "story" as ReelKind,
        emotionTags: [],
        passageId: passage.id,
        hook: d.hook,
        reflection: d.reflection,
        prayer: d.prayer,
        status: "draft",
        version: 1,
      });
      if (!v.ok) console.warn(`⚠️  ${passage.id}/story: ${v.errors.join("; ")}`);
    } catch (e) {
      failed++;
      console.error(`✗ ${passage.id}/story: ${(e as Error).message}`);
    }
  }

  s.insertReels(drafts);
  console.log(`\nDrafted ${drafts.length} reels (${failed} failed). All stored as "draft".`);
}

/** Export drafts to a human-review file (JSON lines for a review table). */
function review() {
  const s = store();
  const reels = s.listReels("draft");
  const rows = reels.map((r) => {
    const p = s.getPassage(r.passageId);
    return {
      id: r.id,
      kind: r.kind,
      emotionTags: r.emotionTags,
      passageId: r.passageId,
      verseRange: p?.verseRange ?? "",
      hook: r.hook,
      reflection: r.reflection,
      prayer: r.prayer,
    };
  });
  mkdirSync(WORK_DIR, { recursive: true });
  writeFileSync(`${WORK_DIR}/review.json`, JSON.stringify(rows, null, 2));
  console.log(`\n${rows.length} drafts exported to ${WORK_DIR}/review.json for human review.`);
  console.log('Approve with:  npm run pipeline -- approve <id> [id...]  (or "approve-all")');
}

function approve(ids: string[], reviewedBy: string) {
  const s = store();
  const drafts = s.listReels("draft");
  const targets = ids.includes("all") ? drafts : drafts.filter((r) => ids.includes(r.id));
  for (const r of targets) {
    s.updateReelStatus(r.id, "approved", reviewedBy);
  }
  console.log(`Approved ${targets.length} reels.`);
}

function run() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "curate":
      curate();
      break;
    case "ingest-web":
      ingestWebCmd();
      break;
    case "draft":
      draft().catch((e) => {
        console.error(e);
        process.exit(1);
      });
      break;
    case "review":
      review();
      break;
    case "approve":
      approve(args.slice(0, -1), args[args.length - 1] ?? "reviewer");
      break;
    case "approve-all":
      approve(["all"], args[0] ?? "reviewer");
      break;
    case "publish":
      console.log(publish(store(), new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")));
      break;
    default:
      console.log(`Usage: pipeline <ingest-web|curate|draft|review|approve|approve-all|publish>`);
      console.log(`  ingest-web    ingest World English Bible (WEB) USFM from data/raw`);
      console.log(`  curate        build passages + filter candidates per emotion`);
      console.log(`  draft         draft + validate reels via LLM (needs DEEPSEEK_API_KEY)`);
      console.log(`  review        export drafts for human review`);
      console.log(`  approve <ids> mark reels approved (last arg = reviewer name)`);
      console.log(`  approve-all   approve every draft`);
      console.log(`  publish       export approved reels to versioned JSON`);
  }
}

run();
