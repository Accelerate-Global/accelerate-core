"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

import { getFirebaseClient } from "../firebase/client";

type AuthState = {
  user: User | null;
  ready: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, ready: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const client = getFirebaseClient();
    if (!client) {
      // Firebase config is not set up yet; keep auth disabled.
      setUser(null);
      setReady(true);
      return;
    }

    const unsub = onAuthStateChanged(
      client.auth,
      (nextUser) => {
        setUser(nextUser);
        setReady(true);
      },
      () => {
        setUser(null);
        setReady(true);
      }
    );

    return () => {
      unsub();
    };
  }, []);

  const value = useMemo(() => ({ user, ready }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

