import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export type FirebaseClient = {
  app: FirebaseApp;
  auth: Auth;
};

function readFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) return null;

  return { apiKey, authDomain, projectId, appId };
}

export function getFirebaseClient(): FirebaseClient | null {
  const config = readFirebaseConfig();
  if (!config) return null;

  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);

  return { app, auth };
}

