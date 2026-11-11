import type { DocumentSnapshot } from 'firebase/firestore';
import type { z } from 'zod';

/** Parses a snapshot through its schema and attaches the id. Returns null for bad or missing data. */
export function parseSnap<S extends z.ZodTypeAny, K extends string>(
  schema: S,
  snap: DocumentSnapshot,
  idKey: K,
): (z.infer<S> & Record<K, string>) | null {
  if (!snap.exists()) return null;
  const result = schema.safeParse(snap.data());
  if (!result.success) {
    console.warn(`Ignoring malformed document ${snap.ref.path}`, result.error.issues[0]?.message);
    return null;
  }
  return { ...(result.data as object), [idKey]: snap.id } as z.infer<S> & Record<K, string>;
}

export function parseSnaps<S extends z.ZodTypeAny, K extends string>(schema: S, snaps: DocumentSnapshot[], idKey: K) {
  return snaps.map((s) => parseSnap(schema, s, idKey)).filter((v): v is NonNullable<typeof v> => v !== null);
}

export const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};
