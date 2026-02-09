import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminApp() {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault()
    });
  }
  return getApp();
}

let _db: ReturnType<typeof getFirestore> | null = null;
export function getDb() {
  if (_db) return _db;
  const db = getFirestore(getAdminApp());
  // Prevent subtle runtime failures when optional fields are omitted but still
  // present as `undefined` in object literals.
  db.settings({ ignoreUndefinedProperties: true });
  _db = db;
  return db;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
