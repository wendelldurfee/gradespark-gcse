/**
 * Seeded pseudo-random helpers.
 *
 * Attempts store their seed, so re-drawing a session from the same seed
 * reproduces the exact question order and choice order. That makes "retake this
 * exact exam" and bug reports reproducible.
 */

/** mulberry32 — small, fast, good enough for shuffling a question pool. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates. Returns a new array; the input is not modified. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Take the first `n` items of a shuffled copy. */
export function sample<T>(items: readonly T[], n: number, rng: () => number): T[] {
  if (n >= items.length) return shuffle(items, rng);
  return shuffle(items, rng).slice(0, Math.max(0, n));
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
