import React, { createContext, useContext, useEffect, useState } from "react";
import { getUser, handleAuthCallback, logout, onAuthChange, type User } from "@netlify/identity";

const IdentitySessionContext = createContext<{
  identityUser: User | null;
  ready: boolean;
  recovery: boolean;
  inviteToken: string | null;
  message: string;
  finishRecovery: () => void;
  refresh: () => Promise<void>;
  user: { fullName: string | null; primaryEmailAddress: { emailAddress: string } | null } | null;
  signOut: () => Promise<void>;
} | null>(null);

export function IdentitySessionProvider({ children }: { children: React.ReactNode }) {
  const [identityUser, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() { setUser(await getUser()); }

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthChange((event, user) => {
      if (!active) return;
      setUser(user);
      if (event === "recovery") setRecovery(true);
      if (event === "logout") { setRecovery(false); setInviteToken(null); }
    });
    void (async () => {
      try {
        const result = await handleAuthCallback();
        if (!active) return;
        if (result?.type === "recovery") setRecovery(true);
        if (result?.type === "invite" && result.token) { setRecovery(true); setInviteToken(result.token); }
        const user = await getUser();
        if (active) setUser(user);
      } catch {
        if (active) setMessage("That account link has expired or is invalid. Request a new link and try again.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; unsubscribe(); };
  }, []);

  return <IdentitySessionContext.Provider value={{
    identityUser, ready, recovery, inviteToken, message, refresh,
    finishRecovery: () => { setRecovery(false); setInviteToken(null); },
    user: identityUser ? {
      fullName: identityUser.name ?? null,
      primaryEmailAddress: identityUser.email ? { emailAddress: identityUser.email } : null,
    } : null,
    signOut: async () => { await logout(); setUser(null); },
  }}>{children}</IdentitySessionContext.Provider>;
}

export function useIdentitySession() {
  const session = useContext(IdentitySessionContext);
  if (!session) throw new Error("IdentitySessionProvider is required");
  return session;
}
