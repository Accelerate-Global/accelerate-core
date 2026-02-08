import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminApp() {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault()
    });
  }
  return getApp();
}

export function getDb() {
  return getFirestore(getAdminApp());
}

