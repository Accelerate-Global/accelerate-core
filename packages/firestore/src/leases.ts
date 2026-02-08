import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

export type RunLease = {
  runId: string;
  ownerId: string;
  expiresAtMs: number;
};

export async function acquireRunLease(input: {
  runId: string;
  ownerId: string;
  ttlMs: number;
}): Promise<{ acquired: boolean; lease?: RunLease; release: () => Promise<void> }> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.runLeases).doc(input.runId);

  const nowMs = Date.now();
  const expiresAtMs = nowMs + input.ttlMs;

  const acquired = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as Partial<RunLease>) : null;
    const currentExpiresAtMs = typeof data?.expiresAtMs === "number" ? data.expiresAtMs : 0;
    const currentOwnerId = typeof data?.ownerId === "string" ? data.ownerId : null;

    const isExpired = currentExpiresAtMs <= nowMs;
    const isSameOwner = currentOwnerId === input.ownerId;

    if (!snap.exists || isExpired || isSameOwner) {
      tx.set(ref, {
        runId: input.runId,
        ownerId: input.ownerId,
        expiresAtMs,
        // Timestamp is useful for debugging in console even if code uses ms.
        expiresAt: Timestamp.fromMillis(expiresAtMs)
      });
      return true;
    }

    return false;
  });

  const release = async () => {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data() as Partial<RunLease>;
      if (data.ownerId !== input.ownerId) return;
      tx.delete(ref);
    });
  };

  if (!acquired) return { acquired: false, release };

  return {
    acquired: true,
    lease: {
      runId: input.runId,
      ownerId: input.ownerId,
      expiresAtMs
    },
    release
  };
}

