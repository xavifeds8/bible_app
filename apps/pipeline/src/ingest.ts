import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SqliteStore, type Verse } from "@bible/db";
import { CANONICAL_BOOKS, normalizeBookName } from "./books.js";

interface RawChapter {
  chapter: number;
  verses: { verse: number; text: string }[];
}

interface RawBook {
  name: string;
  chapters: RawChapter[];
}

interface RawBible {
  translation: string;
  books: Record<string, RawBook>;
}

function verseId(translation: string, book: string, chapter: number, verse: number): string {
  return `${translation}:${book}:${chapter}:${verse}`;
}

export function parseBible(raw: RawBible, translation: "KJV" | "WEB"): Verse[] {
  const verses: Verse[] = [];
  const bookKeys = Object.keys(raw.books);
  if (bookKeys.length !== 66) {
    console.warn(`Expected 66 books, found ${bookKeys.length}`);
  }

  for (let i = 0; i < 66; i++) {
    const rawBook = raw.books[String(i)];
    if (!rawBook) continue;
    const book = normalizeBookName(rawBook.name);
    const canonical = CANONICAL_BOOKS[i];
    if (book !== canonical) {
      console.warn(`Book ${i} mismatch: source="${rawBook.name}" canonical="${canonical}"`);
    }
    for (const chapter of rawBook.chapters) {
      for (const v of chapter.verses) {
        verses.push({
          id: verseId(translation, book, chapter.chapter, v.verse),
          translation,
          book,
          chapter: chapter.chapter,
          verse: v.verse,
          text: v.text,
        });
      }
    }
  }
  return verses;
}

export function ingest(dataDir: string, dbPath: string, translation: "KJV" | "WEB", file: string) {
  const raw = JSON.parse(readFileSync(resolve(dataDir, file), "utf-8")) as RawBible;
  const verses = parseBible(raw, translation);
  const store = new SqliteStore(dbPath);
  store.insertVerses(verses);
  return verses.length;
}
