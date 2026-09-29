import type { Passage, PassageType, Store, Translation } from "@bible/db";

export interface PassageDef {
  slug: string;
  title: string;
  type: PassageType;
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
}

export function formatRange(p: PassageDef): string {
  return `${p.book} ${p.chapter}:${p.startVerse}${p.endVerse === p.startVerse ? "" : `-${p.endVerse}`}`;
}

/**
 * Curated seed passages, chunked by story/pericope (not token size).
 * This is editorial input — a human expands and reviews it.
 */
export const SEED_PASSAGES: PassageDef[] = [
  // --- Comfort / emotion passages ---
  { slug: "psalm-23", title: "The Lord Is My Shepherd", type: "psalm", book: "Psalms", chapter: 23, startVerse: 1, endVerse: 6 },
  { slug: "psalm-34-18", title: "Near to the Brokenhearted", type: "psalm", book: "Psalms", chapter: 34, startVerse: 18, endVerse: 18 },
  { slug: "psalm-46-1", title: "Our Refuge and Strength", type: "psalm", book: "Psalms", chapter: 46, startVerse: 1, endVerse: 3 },
  { slug: "psalm-56-3", title: "When I Am Afraid", type: "psalm", book: "Psalms", chapter: 56, startVerse: 3, endVerse: 4 },
  { slug: "psalm-94-19", title: "Anxiety and Consolation", type: "psalm", book: "Psalms", chapter: 94, startVerse: 19, endVerse: 19 },
  { slug: "psalm-100", title: "A Psalm of Thanksgiving", type: "psalm", book: "Psalms", chapter: 100, startVerse: 1, endVerse: 5 },
  { slug: "psalm-103-12", title: "As Far as East from West", type: "psalm", book: "Psalms", chapter: 103, startVerse: 8, endVerse: 14 },
  { slug: "psalm-139-7", title: "Where Can I Flee", type: "psalm", book: "Psalms", chapter: 139, startVerse: 7, endVerse: 12 },
  { slug: "psalm-147-3", title: "He Heals the Brokenhearted", type: "psalm", book: "Psalms", chapter: 147, startVerse: 3, endVerse: 3 },
  { slug: "psalm-51", title: "Create in Me a Clean Heart", type: "prayer", book: "Psalms", chapter: 51, startVerse: 1, endVerse: 12 },

  { slug: "matt-5-4", title: "Blessed Are Those Who Mourn", type: "teaching", book: "Matthew", chapter: 5, startVerse: 4, endVerse: 4 },
  { slug: "matt-6-25", title: "Do Not Worry", type: "teaching", book: "Matthew", chapter: 6, startVerse: 25, endVerse: 34 },
  { slug: "matt-11-28", title: "Come unto Me", type: "teaching", book: "Matthew", chapter: 11, startVerse: 28, endVerse: 30 },
  { slug: "matt-28-20", title: "I Am with You Always", type: "teaching", book: "Matthew", chapter: 28, startVerse: 20, endVerse: 20 },

  { slug: "john-11-35", title: "Jesus Wept", type: "story", book: "John", chapter: 11, startVerse: 35, endVerse: 36 },
  { slug: "john-14-27", title: "Peace I Leave with You", type: "teaching", book: "John", chapter: 14, startVerse: 27, endVerse: 27 },

  { slug: "rom-8-1", title: "No Condemnation", type: "teaching", book: "Romans", chapter: 8, startVerse: 1, endVerse: 1 },
  { slug: "rom-8-28", title: "All Things Work Together", type: "teaching", book: "Romans", chapter: 8, startVerse: 28, endVerse: 28 },
  { slug: "rom-8-38", title: "Nothing Can Separate Us", type: "teaching", book: "Romans", chapter: 8, startVerse: 38, endVerse: 39 },
  { slug: "rom-15-13", title: "The God of Hope", type: "teaching", book: "Romans", chapter: 15, startVerse: 13, endVerse: 13 },

  { slug: "phil-4-6", title: "Be Anxious for Nothing", type: "teaching", book: "Philippians", chapter: 4, startVerse: 6, endVerse: 7 },
  { slug: "1pet-5-7", title: "Cast Your Cares", type: "teaching", book: "1 Peter", chapter: 5, startVerse: 7, endVerse: 7 },
  { slug: "2tim-1-7", title: "Not a Spirit of Fear", type: "teaching", book: "2 Timothy", chapter: 1, startVerse: 7, endVerse: 7 },
  { slug: "josh-1-9", title: "Be Strong and Courageous", type: "teaching", book: "Joshua", chapter: 1, startVerse: 9, endVerse: 9 },
  { slug: "isa-41-10", title: "Fear Not, I Am with You", type: "teaching", book: "Isaiah", chapter: 41, startVerse: 10, endVerse: 10 },
  { slug: "eph-4-26", title: "Do Not Let the Sun Go Down", type: "teaching", book: "Ephesians", chapter: 4, startVerse: 26, endVerse: 27 },
  { slug: "james-1-19", title: "Slow to Anger", type: "teaching", book: "James", chapter: 1, startVerse: 19, endVerse: 20 },
  { slug: "prov-15-1", title: "A Soft Answer", type: "teaching", book: "Proverbs", chapter: 15, startVerse: 1, endVerse: 1 },
  { slug: "psalm-37-8", title: "Fret Not", type: "psalm", book: "Psalms", chapter: 37, startVerse: 8, endVerse: 9 },
  { slug: "deut-31-6", title: "He Will Never Leave You", type: "teaching", book: "Deuteronomy", chapter: 31, startVerse: 6, endVerse: 6 },
  { slug: "heb-13-5", title: "Never Will I Forsake You", type: "teaching", book: "Hebrews", chapter: 13, startVerse: 5, endVerse: 5 },
  { slug: "1john-1-9", title: "He Is Faithful to Forgive", type: "teaching", book: "1 John", chapter: 1, startVerse: 9, endVerse: 9 },
  { slug: "jer-29-11", title: "Plans to Give You Hope", type: "teaching", book: "Jeremiah", chapter: 29, startVerse: 11, endVerse: 11 },
  { slug: "lam-3-22", title: "New Every Morning", type: "teaching", book: "Lamentations", chapter: 3, startVerse: 22, endVerse: 23 },
  { slug: "1thess-5-16", title: "Give Thanks in Everything", type: "teaching", book: "1 Thessalonians", chapter: 5, startVerse: 16, endVerse: 18 },
  { slug: "psalm-136-1", title: "His Mercy Endures Forever", type: "psalm", book: "Psalms", chapter: 136, startVerse: 1, endVerse: 1 },
  { slug: "col-3-15", title: "Let Peace Rule", type: "teaching", book: "Colossians", chapter: 3, startVerse: 15, endVerse: 17 },

  // --- Story passages ---
  { slug: "david-goliath", title: "David and Goliath", type: "story", book: "1 Samuel", chapter: 17, startVerse: 40, endVerse: 51 },
  { slug: "prodigal-son", title: "The Prodigal Son", type: "story", book: "Luke", chapter: 15, startVerse: 11, endVerse: 32 },
  { slug: "good-samaritan", title: "The Good Samaritan", type: "story", book: "Luke", chapter: 10, startVerse: 25, endVerse: 37 },
  { slug: "ruth-loyalty", title: "Ruth's Loyalty", type: "story", book: "Ruth", chapter: 1, startVerse: 16, endVerse: 18 },
  { slug: "joseph-forgiveness", title: "Joseph Forgives His Brothers", type: "story", book: "Genesis", chapter: 50, startVerse: 19, endVerse: 21 },
  { slug: "daniel-lions", title: "Daniel in the Lions' Den", type: "story", book: "Daniel", chapter: 6, startVerse: 16, endVerse: 23 },
  { slug: "feeding-5000", title: "Feeding the Five Thousand", type: "story", book: "John", chapter: 6, startVerse: 1, endVerse: 14 },
  { slug: "calms-storm", title: "Jesus Calms the Storm", type: "story", book: "Mark", chapter: 4, startVerse: 35, endVerse: 41 },
  { slug: "peter-walks", title: "Peter Walks on Water", type: "story", book: "Matthew", chapter: 14, startVerse: 22, endVerse: 33 },
  { slug: "woman-at-well", title: "The Woman at the Well", type: "story", book: "John", chapter: 4, startVerse: 1, endVerse: 26 },
  { slug: "zacchaeus", title: "Zacchaeus", type: "story", book: "Luke", chapter: 19, startVerse: 1, endVerse: 10 },
  { slug: "lost-sheep", title: "The Lost Sheep", type: "story", book: "Luke", chapter: 15, startVerse: 1, endVerse: 7 },
  { slug: "lords-prayer", title: "The Lord's Prayer", type: "prayer", book: "Matthew", chapter: 6, startVerse: 9, endVerse: 13 },
  { slug: "beatitudes", title: "The Beatitudes", type: "teaching", book: "Matthew", chapter: 5, startVerse: 1, endVerse: 12 },
  { slug: "1cor-13", title: "The Way of Love", type: "teaching", book: "1 Corinthians", chapter: 13, startVerse: 4, endVerse: 8 },
];

export function buildPassages(
  store: Store,
  defs: PassageDef[],
  translation: Translation = "WEB"
): Passage[] {
  const passages: Passage[] = [];
  for (const def of defs) {
    const verseIds: string[] = [];
    const texts: string[] = [];
    for (let v = def.startVerse; v <= def.endVerse; v++) {
      const id = `${translation}:${def.book}:${def.chapter}:${v}`;
      const verse = store.getVerse(id);
      if (!verse) {
        console.warn(`Missing verse ${id} for passage "${def.slug}"`);
        continue;
      }
      verseIds.push(id);
      texts.push(verse.text);
    }
    passages.push({
      id: def.slug,
      title: def.title,
      type: def.type,
      verseRange: formatRange(def),
      verseIds,
      text: texts.join(" "),
    });
  }
  return passages;
}
