import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Verse, Translation } from "@bible/db";
import { normalizeBookName } from "./books.js";

/** 66 canonical books, eBible.org USFM file prefixes (WEB), in canon order. */
const BOOK_FILES = [
  "02-GEN", "03-EXO", "04-LEV", "05-NUM", "06-DEU", "07-JOS", "08-JDG", "09-RUT",
  "10-1SA", "11-2SA", "12-1KI", "13-2KI", "14-1CH", "15-2CH", "16-EZR", "17-NEH",
  "18-EST", "19-JOB", "20-PSA", "21-PRO", "22-ECC", "23-SNG", "24-ISA", "25-JER",
  "26-LAM", "27-EZK", "28-DAN", "29-HOS", "30-JOL", "31-AMO", "32-OBA", "33-JON",
  "34-MIC", "35-NAM", "36-HAB", "37-ZEP", "38-HAG", "39-ZEC", "40-MAL", "70-MAT",
  "71-MRK", "72-LUK", "73-JHN", "74-ACT", "75-ROM", "76-1CO", "77-2CO", "78-GAL",
  "79-EPH", "80-PHP", "81-COL", "82-1TH", "83-2TH", "84-1TI", "85-2TI", "86-TIT",
  "87-PHM", "88-HEB", "89-JAS", "90-1PE", "91-2PE", "92-1JN", "93-2JN", "94-3JN",
  "95-JUD", "96-REV",
];

const FILE_SUFFIX = "eng-web.usfm";

/**
 * Strip USFM markup from a verse fragment: footnotes, crossrefs, Strong's
 * attribute specifiers, and all word/character markers.
 */
export function cleanUsfm(raw: string): string {
  let t = raw;
  // Footnotes, cross-references, figures (may span multiple lines).
  t = t.replace(/\\f[\s\S]*?\\f\*/g, "");
  t = t.replace(/\\x[\s\S]*?\\x\*/g, "");
  t = t.replace(/\\fig[\s\S]*?\\fig\*/g, "");
  // Attribute specifiers (|strong="H8064" etc.).
  t = t.replace(/\|[^\\]*/g, "");
  // Closing character markers (\w*, \qs*, \nd*, \k*, ...).
  t = t.replace(/\\([A-Za-z0-9+]+)\*/g, "");
  // Opening character markers (\w, \qs, \+wh, ...). Remove the marker and its
  // delimiter space; surrounding whitespace (or punctuation) is preserved.
  t = t.replace(/\\([A-Za-z0-9+]+)\s?/g, "");
  return t.replace(/\s+/g, " ").trim();
}

export function parseUsfm(content: string, translation: Translation): Verse[] {
  const verses: Verse[] = [];
  let book = "";
  let chapter = 0;
  let curVerse: number | null = null;
  let curText = "";

  const flush = () => {
    if (curVerse !== null) {
      const text = cleanUsfm(curText);
      if (text) {
        verses.push({
          id: `${translation}:${book}:${chapter}:${curVerse}`,
          translation,
          book,
          chapter,
          verse: curVerse,
          text,
        });
      }
    }
    curVerse = null;
    curText = "";
  };

  for (const line of content.split("\n")) {
    if (line.startsWith("\\h ")) {
      book = normalizeBookName(line.slice(3).trim());
      continue;
    }
    if (line.startsWith("\\c ")) {
      flush();
      chapter = parseInt(line.slice(3).trim(), 10);
      continue;
    }
    if (line.startsWith("\\v ")) {
      flush();
      const m = line.match(/^\\v\s+(\d+)\s*(.*)$/);
      if (m) {
        curVerse = parseInt(m[1], 10);
        curText = m[2];
      }
      continue;
    }
    if (curVerse !== null) {
      // Verse continuation: poetry/indent markers keep their text.
      const m = line.match(/^\\(q\d?|b|m|nb|li\d?|pi\d?|pc|ph)\s?(.*)$/);
      if (m) {
        curText += " " + m[2];
      } else if (/^\s/.test(line) && line.trim()) {
        curText += " " + line.trim();
      }
      // Everything else (\\p, \\s, \\d, headings) is not verse content.
    }
  }
  flush();
  return verses;
}

export function ingestWeb(rawDir: string, translation: Translation = "WEB"): Verse[] {
  const all: Verse[] = [];
  for (const prefix of BOOK_FILES) {
    const path = resolve(rawDir, `${prefix}${FILE_SUFFIX}`);
    const content = readFileSync(path, "utf-8");
    const verses = parseUsfm(content, translation);
    all.push(...verses);
  }
  return all;
}
