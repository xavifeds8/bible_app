import type { PublishedReel } from "./types";

const DB_NAME = "still-waters";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("saved")) db.createObjectStore("saved", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function getSavedReels(): Promise<PublishedReel[]> {
  try {
    const all = await tx<PublishedReel[]>("saved", "readonly", (s) => s.getAll());
    return all ?? [];
  } catch {
    return [];
  }
}

export async function isSaved(id: string): Promise<boolean> {
  try {
    const r = await tx<unknown>("saved", "readonly", (s) => s.get(id));
    return !!r;
  } catch {
    return false;
  }
}

export async function saveReel(reel: PublishedReel): Promise<void> {
  try {
    await tx("saved", "readwrite", (s) => s.put(reel));
  } catch {
    /* ignore */
  }
}

export async function unsaveReel(id: string): Promise<void> {
  try {
    await tx("saved", "readwrite", (s) => s.delete(id));
  } catch {
    /* ignore */
  }
}

interface StreakMeta {
  streak: number;
  lastVisit: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function recordVisit(): Promise<number> {
  try {
    const meta = await tx<StreakMeta | undefined>("meta", "readonly", (s) => s.get("streak"));
    const t = today();
    let streak: number;
    if (meta && meta.lastVisit === t) streak = meta.streak;
    else if (meta && meta.lastVisit === yesterday()) streak = meta.streak + 1;
    else streak = 1;
    await tx("meta", "readwrite", (s) => s.put({ streak, lastVisit: t }, "streak"));
    return streak;
  } catch {
    return 0;
  }
}

export async function getStreak(): Promise<number> {
  try {
    const meta = await tx<StreakMeta | undefined>("meta", "readonly", (s) => s.get("streak"));
    return meta?.streak ?? 0;
  } catch {
    return 0;
  }
}
