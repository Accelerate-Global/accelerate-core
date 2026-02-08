import { getDb } from "./admin";
import { COLLECTIONS } from "./collections";

export type ConnectorRecord = {
  id: string;
  displayName: string;
  description?: string;
  updatedAt: string; // ISO
};

export async function upsertConnector(connector: Omit<ConnectorRecord, "updatedAt">): Promise<void> {
  const db = getDb();
  await db
    .collection(COLLECTIONS.connectors)
    .doc(connector.id)
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

export async function getConnectorById(id: string): Promise<ConnectorRecord | null> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.connectors).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as ConnectorRecord;
}
