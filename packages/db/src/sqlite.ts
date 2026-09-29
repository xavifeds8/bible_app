import { DatabaseSync } from "node:sqlite";
import type {
  Verse,
  Passage,
  Reel,
  Quiz,
  DailyVerse,
  DenylistEntry,
  SafetyEvent,
  Feedback,
} from "./types.js";

export interface Store {
  insertVerses(verses: Verse[]): void;
  getVerse(id: string): Verse | undefined;
  listVerses(book?: string): Verse[];

  insertPassages(passages: Passage[]): void;
  getPassage(id: string): Passage | undefined;
  listPassages(type?: Passage["type"]): Passage[];

  insertReels(reels: Reel[]): void;
  updateReelStatus(id: string, status: Reel["status"], reviewedBy?: string): void;
  listReels(status?: Reel["status"]): Reel[];

  insertQuizzes(quizzes: Quiz[]): void;
  listQuizzes(): Quiz[];

  setDailyVerse(date: string, verseIds: string[]): void;
  getDailyVerse(date: string): DailyVerse | undefined;

  insertDenylist(entries: DenylistEntry[]): void;
  listDenylist(): DenylistEntry[];

  recordSafetyEvent(category: string): void;
  recordFeedback(feedback: Feedback): void;
}

export class SqliteStore implements Store {
  private db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS verses (
        id TEXT PRIMARY KEY,
        translation TEXT NOT NULL,
        book TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_verses_book ON verses(book, chapter, verse);

      CREATE TABLE IF NOT EXISTS passages (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        verse_range TEXT NOT NULL,
        verse_ids TEXT NOT NULL,
        text TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reels (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        emotion_tags TEXT NOT NULL,
        passage_id TEXT NOT NULL,
        hook TEXT NOT NULL,
        reflection TEXT NOT NULL,
        prayer TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        reviewed_by TEXT,
        reviewed_at TEXT,
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        passage_id TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        answer INTEGER NOT NULL,
        explanation TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft'
      );

      CREATE TABLE IF NOT EXISTS daily_verses (
        date TEXT PRIMARY KEY,
        verse_ids TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS denylist (
        emotion TEXT NOT NULL,
        passage_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        PRIMARY KEY (emotion, passage_id)
      );

      CREATE TABLE IF NOT EXISTS safety_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        thumbs TEXT NOT NULL,
        reason TEXT
      );
    `);
  }

  insertVerses(verses: Verse[]) {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO verses (id, translation, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?, ?)"
    );
    this.db.exec("BEGIN");
    try {
      for (const v of verses) {
        stmt.run(v.id, v.translation, v.book, v.chapter, v.verse, v.text);
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  getVerse(id: string): Verse | undefined {
    const row = this.db.prepare("SELECT * FROM verses WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? (this.rowToVerse(row) as Verse) : undefined;
  }

  listVerses(book?: string): Verse[] {
    const rows = book
      ? this.db
          .prepare("SELECT * FROM verses WHERE book = ? ORDER BY chapter, verse")
          .all(book)
      : this.db.prepare("SELECT * FROM verses ORDER BY book, chapter, verse").all();
    return (rows as Record<string, unknown>[]).map((r) => this.rowToVerse(r));
  }

  insertPassages(passages: Passage[]) {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO passages (id, title, type, verse_range, verse_ids, text) VALUES (?, ?, ?, ?, ?, ?)"
    );
    this.db.exec("BEGIN");
    try {
      for (const p of passages) {
        stmt.run(p.id, p.title, p.type, p.verseRange, JSON.stringify(p.verseIds), p.text);
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  getPassage(id: string): Passage | undefined {
    const row = this.db.prepare("SELECT * FROM passages WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToPassage(row) : undefined;
  }

  listPassages(type?: Passage["type"]): Passage[] {
    const rows = type
      ? this.db.prepare("SELECT * FROM passages WHERE type = ?").all(type)
      : this.db.prepare("SELECT * FROM passages").all();
    return (rows as Record<string, unknown>[]).map((r) => this.rowToPassage(r));
  }

  insertReels(reels: Reel[]) {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO reels (id, kind, emotion_tags, passage_id, hook, reflection, prayer, status, reviewed_by, reviewed_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    this.db.exec("BEGIN");
    try {
      for (const r of reels) {
        stmt.run(
          r.id,
          r.kind,
          JSON.stringify(r.emotionTags),
          r.passageId,
          r.hook,
          r.reflection,
          r.prayer,
          r.status,
          r.reviewedBy ?? null,
          r.reviewedAt ?? null,
          r.version
        );
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  updateReelStatus(id: string, status: Reel["status"], reviewedBy?: string) {
    this.db
      .prepare("UPDATE reels SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?")
      .run(status, reviewedBy ?? null, new Date().toISOString(), id);
  }

  listReels(status?: Reel["status"]): Reel[] {
    const rows = status
      ? this.db.prepare("SELECT * FROM reels WHERE status = ?").all(status)
      : this.db.prepare("SELECT * FROM reels").all();
    return (rows as Record<string, unknown>[]).map((r) => this.rowToReel(r));
  }

  insertQuizzes(quizzes: Quiz[]) {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO quizzes (id, passage_id, question, options, answer, explanation, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    this.db.exec("BEGIN");
    try {
      for (const q of quizzes) {
        stmt.run(q.id, q.passageId, q.question, JSON.stringify(q.options), q.answer, q.explanation, q.status);
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  listQuizzes(): Quiz[] {
    const rows = this.db.prepare("SELECT * FROM quizzes").all();
    return (rows as Record<string, unknown>[]).map((r) => this.rowToQuiz(r));
  }

  setDailyVerse(date: string, verseIds: string[]) {
    this.db
      .prepare("INSERT OR REPLACE INTO daily_verses (date, verse_ids) VALUES (?, ?)")
      .run(date, JSON.stringify(verseIds));
  }

  getDailyVerse(date: string): DailyVerse | undefined {
    const row = this.db.prepare("SELECT * FROM daily_verses WHERE date = ?").get(date) as
      | Record<string, unknown>
      | undefined;
    return row ? { date: row.date as string, verseIds: JSON.parse(row.verse_ids as string) } : undefined;
  }

  insertDenylist(entries: DenylistEntry[]) {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO denylist (emotion, passage_id, reason) VALUES (?, ?, ?)"
    );
    this.db.exec("BEGIN");
    try {
      for (const e of entries) {
        stmt.run(e.emotion, e.passageId, e.reason);
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  listDenylist(): DenylistEntry[] {
    const rows = this.db.prepare("SELECT * FROM denylist").all();
    return (rows as Record<string, unknown>[]).map((r) => ({
      emotion: r.emotion,
      passageId: r.passage_id,
      reason: r.reason,
    })) as DenylistEntry[];
  }

  recordSafetyEvent(category: string) {
    this.db
      .prepare("INSERT INTO safety_events (category, timestamp) VALUES (?, ?)")
      .run(category, new Date().toISOString());
  }

  recordFeedback(feedback: Feedback) {
    this.db
      .prepare("INSERT INTO feedback (item_id, thumbs, reason) VALUES (?, ?, ?)")
      .run(feedback.itemId, feedback.thumbs, feedback.reason ?? null);
  }

  private rowToVerse(r: Record<string, unknown>): Verse {
    return {
      id: r.id as string,
      translation: r.translation as Verse["translation"],
      book: r.book as string,
      chapter: r.chapter as number,
      verse: r.verse as number,
      text: r.text as string,
    };
  }

  private rowToPassage(r: Record<string, unknown>): Passage {
    return {
      id: r.id as string,
      title: r.title as string,
      type: r.type as Passage["type"],
      verseRange: r.verse_range as string,
      verseIds: JSON.parse(r.verse_ids as string),
      text: r.text as string,
    };
  }

  private rowToReel(r: Record<string, unknown>): Reel {
    return {
      id: r.id as string,
      kind: r.kind as Reel["kind"],
      emotionTags: JSON.parse(r.emotion_tags as string),
      passageId: r.passage_id as string,
      hook: r.hook as string,
      reflection: r.reflection as string,
      prayer: r.prayer as string,
      status: r.status as Reel["status"],
      reviewedBy: (r.reviewed_by as string | null) ?? undefined,
      reviewedAt: (r.reviewed_at as string | null) ?? undefined,
      version: r.version as number,
    };
  }

  private rowToQuiz(r: Record<string, unknown>): Quiz {
    return {
      id: r.id as string,
      passageId: r.passage_id as string,
      question: r.question as string,
      options: JSON.parse(r.options as string),
      answer: r.answer as number,
      explanation: r.explanation as string,
      status: r.status as Quiz["status"],
    };
  }
}
