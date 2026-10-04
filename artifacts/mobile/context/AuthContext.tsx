import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadApiOrigin, loadSavedUser, getSavedToken, saveSession, clearSession, saveApiOrigin } from '@/lib/api-config';
import type { Json } from '@/lib/data';

type Challenge = { email: string; token?: string; mode: 'email' | '2fa' };
type AuthValue = {
  ready: boolean;
  token: string | null;
  user: Json | null;
  apiOrigin: string;
  challenge: Challenge | null;
  setChallenge: (value: Challenge | null) => void;
  acceptSession: (token: string, user: Json) => Promise<void>;
  signOut: () => Promise<void>;
  updateOrigin: (value: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Json | null>(null);
  const [apiOrigin, setApiOrigin] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadApiOrigin().catch(() => ''),
      getSavedToken().catch(() => null),
      loadSavedUser().catch(() => null),
    ]).then(([origin, savedToken, savedUser]) => {
      if (!mounted) return;
      setApiOrigin(origin);
      setToken(savedToken);
      setUser(savedUser);
      setReady(true);
    }).catch(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  const acceptSession = async (nextToken: string, nextUser: Json) => {
    await saveSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setChallenge(null);
  };
  const signOut = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setChallenge(null);
  };
  const updateOrigin = async (value: string) => setApiOrigin(await saveApiOrigin(value));

  return (
    <AuthContext.Provider value={{ ready, token, user, apiOrigin, challenge, setChallenge, acceptSession, signOut, updateOrigin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}