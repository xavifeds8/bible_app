// Fetch a public-domain image from Wikimedia Commons by search query.
// Usage: node fetch_image.mjs "<query>" <outfile.jpg>
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const [, , query, out] = process.argv;
if (!query || !out) {
  console.error("usage: node fetch_image.mjs <query> <outfile>");
  process.exit(1);
}

const api =
  "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
  encodeURIComponent(query) +
  "&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&iiurlwidth=1280&format=json&origin=*";

const res = await fetch(api, { headers: { "User-Agent": "bible-app-poc/0.1" } });
const j = await res.json();
const pages = Object.values(j.query?.pages ?? {});

const img = pages
  .map((p) => p.imageinfo?.[0])
  .find((ii) => ii && (ii.mime === "image/jpeg" || ii.mime === "image/png"));

if (!img) {
  console.error("NO_RESULT", query);
  process.exit(1);
}

const url = img.thumburl || img.url;
const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
await mkdir(dirname(out), { recursive: true });
await writeFile(out, buf);
console.log("OK", out, "|", pages[0]?.title, "|", buf.length, "bytes");
