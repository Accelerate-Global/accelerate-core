import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

export type ConnectorRecord = {
  key: string;
  displayName: string;
  description?: string;
  updatedAt: string; // ISO
};

export async function upsertConnector(connector: Omit<ConnectorRecord, "updatedAt">): Promise<void> {
  const db = getDb();
  await db
    .collection(COLLECTIONS.connectors)
    .doc(connector.key)
    .set(
      {
        ...connector,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
}

export async function listConnectors(limit = 100): Promise<ConnectorRecord[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.connectors).limit(limit).get();
  return snap.docs.map((d) => d.data() as ConnectorRecord);
}

