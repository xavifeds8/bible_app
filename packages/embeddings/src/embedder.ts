export interface Embedder {
  /** Embed a list of texts into fixed-size vectors. */
  embed(texts: string[]): Promise<number[][]>;
}

/** Normalize a vector to unit length. */
export function normalize(vec: number[]): number[] {
  const len = Math.hypot(...vec);
  if (len === 0) return vec;
  return vec.map((v) => v / len);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "of", "to", "in", "on", "for",
  "with", "that", "this", "these", "those", "is", "are", "was", "were", "be",
  "been", "being", "he", "she", "it", "they", "we", "you", "i", "me", "my",
  "his", "her", "their", "our", "your", "from", "by", "as", "at", "into",
  "not", "no", "so", "then", "there", "when", "will", "shall", "have", "has",
  "had", "do", "does", "did", "unto", "thy", "thou", "thee", "ye", "hath",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Zero-dependency lexical embedder. Builds a shared vocabulary over a corpus,
 * then represents each text as a bag-of-words vector. Good enough for
 * candidate retrieval over a few hundred passages. Swap for BGE-M3 (or a
 * hosted multilingual model) behind the same interface later.
 */
export class LexicalEmbedder implements Embedder {
  private vocab: Map<string, number> = new Map();

  buildVocab(texts: string[]) {
    for (const t of texts) {
      for (const tok of tokenize(t)) {
        if (!this.vocab.has(tok)) this.vocab.set(tok, this.vocab.size);
      }
    }
  }

  private toVector(text: string): number[] {
    const vec = new Array(this.vocab.size).fill(0);
    for (const tok of tokenize(text)) {
      const idx = this.vocab.get(tok);
      if (idx !== undefined) vec[idx]++;
    }
    return vec;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => normalize(this.toVector(t)));
  }
}
