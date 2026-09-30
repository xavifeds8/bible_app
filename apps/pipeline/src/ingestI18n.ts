import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Translation, Verse } from "@bible/db";
import { CANONICAL_BOOKS } from "./books.js";
import { parseUsfm } from "./usfm.js";

interface RawJsonBook {
  name: string;
  chapters: string[][];
}

type RawJsonBible = Record<string, RawJsonBook>;

/** Strip IRV inline cross-references like "(इब्रा. 1:10, इब्रा. 11:3)". */
function cleanHindi(text: string): string {
  return text
    .replace(/\s*\([^()]*\d+\s*:\s*\d+[^()]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hindi IRV (thiagobodruk JSON): keys 0..65 in canonical order; each book has
 * `chapters` (array of arrays of verse strings, 1-indexed by position).
 */
export function parseHindiIrv(json: RawJsonBible, translation: Translation = "HIN"): Verse[] {
  const verses: Verse[] = [];
  for (let i = 0; i < 66; i++) {
    const book = CANONICAL_BOOKS[i];
    const rawBook = json[String(i)];
    if (!rawBook) continue;
    rawBook.chapters.forEach((chapter, ci) => {
      chapter.forEach((text, vi) => {
        const clean = cleanHindi(text);
        if (!clean) return;
        verses.push({
          id: `${translation}:${book}:${ci + 1}:${vi + 1}`,
          translation,
          book,
          chapter: ci + 1,
          verse: vi + 1,
          text: clean,
        });
      });
    });
  }
  return verses;
}

/**
 * Kannada 1951 (BSI, public domain) USFM. Files are numbered 01..39 (Gen–Mal)
 * and 41..67 (Mat–Rev), so map the numeric prefix to canonical index.
 */
export function parseKannada(rawDir: string, translation: Translation = "KAN"): Verse[] {
  const dir = resolve(rawDir, "kannada");
  const files = readdirSync(dir).filter((f) => f.endsWith(".usfm"));
  const all: Verse[] = [];

  for (const file of files) {
    const m = file.match(/^(\d+)_/);
    if (!m) continue;
    const nn = parseInt(m[1], 10);
    const idx = nn <= 39 ? nn - 1 : nn - 2;
    const book = CANONICAL_BOOKS[idx];
    if (!book) {
      console.warn(`skip ${file}: no canonical book for index ${idx}`);
      continue;
    }
    const content = readFileSync(resolve(dir, file), "utf-8");
    all.push(...parseUsfm(content, translation, book));
  }
  return all;
}
