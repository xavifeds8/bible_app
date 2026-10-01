// Build the themed image library from Wikimedia Commons (throttled, resumable).
// Usage: node apps/pipeline/scripts/fetch_library.mjs
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";

const THEMES = JSON.parse(await readFile("apps/pipeline/library_themes.json", "utf-8"));
const PER_QUERY = 5;
const UA = { "User-Agent": "bible-app-poc/0.1 (contact: poc)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function getJson(url, tries = 5) {
  for (let t = 0; t < tries; t++) {
    try {
      const text = await (await fetch(url, { headers: UA })).text();
      if (text.startsWith("You are")) {
        await sleep(2000 * (t + 1));
        continue;
      }
      return JSON.parse(text);
    } catch {
      await sleep(2000 * (t + 1));
    }
  }
  return null;
}

async function download(url, out, tries = 5) {
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) {
        await sleep(2000 * (t + 1));
        continue;
      }
      await writeFile(out, Buffer.from(await r.arrayBuffer()));
      return true;
    } catch {
      await sleep(2000 * (t + 1));
    }
  }
  return false;
}

async function search(query) {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
    encodeURIComponent(query) +
    "&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime&iiurlwidth=1280&format=json&origin=*";
  const j = await getJson(api);
  return Object.values(j?.query?.pages ?? {}).filter(
    (p) => p.imageinfo?.[0] && (p.imageinfo[0].mime === "image/jpeg" || p.imageinfo[0].mime === "image/png")
  );
}

let total = 0;
for (const [theme, queries] of Object.entries(THEMES)) {
  if (await exists(`data/library/${theme}/0.jpg`)) {
    console.log(theme, "skip");
    continue;
  }
  let i = 0;
  for (const q of queries) {
    const pages = await search(q);
    await sleep(800);
    for (const p of pages.slice(0, PER_QUERY)) {
      const ii = p.imageinfo[0];
      const url = ii.thumburl || ii.url;
      const out = `data/library/${theme}/${i}.jpg`;
      await mkdir(dirname(out), { recursive: true });
      if (await download(url, out)) {
        i++;
        await sleep(700);
      }
    }
  }
  total += i;
  console.log(theme, i);
}
console.log("TOTAL", total);
