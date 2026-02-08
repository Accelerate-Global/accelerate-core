"use client";

import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";

import { getFirebaseClient } from "../firebase/client";
import { useAuth } from "./AuthProvider";

export function AuthControls() {
  const { user, ready } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const onSignIn = async () => {
    setError(null);
    const client = getFirebaseClient();
    if (!client) {
      setError("Firebase config not set");
      return;
    }
    try {
      await signInWithPopup(client.auth, new GoogleAuthProvider());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    }
  };

  const onSignOut = async () => {
    setError(null);
    const client = getFirebaseClient();
    if (!client) return;
    try {
      await signOut(client.auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-out failed");
    }
  };

  if (!ready) return <span className="muted">Auth: loading...</span>;

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {user ? (
        <>
          <span className="muted">{user.email ?? user.uid}</span>
          <button className="btn" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </>
      ) : (
        <button className="btn" type="button" onClick={onSignIn}>
          Sign in
        </button>
      )}
      {error ? <span className="muted">{error}</span> : null}
    </div>
  );
}

