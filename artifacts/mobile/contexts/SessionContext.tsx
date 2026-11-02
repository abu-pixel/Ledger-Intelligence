import React, { createContext, useContext, useMemo } from "react";
import { useClerk, useUser } from "@clerk/expo";

export type AppSessionUser = {
  fullName: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
};

export type AppSession = {
  user: AppSessionUser | null;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<AppSession | null>(null);

export function ClerkSessionProvider({ children }: { children: React.ReactNode }) {
  const { signOut } = useClerk();
  const { user } = useUser();

  const value = useMemo<AppSession>(
    () => ({
      user: user
        ? {
            fullName: user.fullName ?? null,
            primaryEmailAddress: user.primaryEmailAddress?.emailAddress
              ? { emailAddress: user.primaryEmailAddress.emailAddress }
              : null,
          }
        : null,
      signOut: async () => {
        await signOut();
      },
    }),
    [signOut, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

const localSession: AppSession = {
  user: {
    fullName: "Local Preview",
    primaryEmailAddress: { emailAddress: "local-preview@ledgerly.dev" },
  },
  signOut: async () => undefined,
};

export function LocalSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionContext.Provider value={localSession}>{children}</SessionContext.Provider>;
}

export function useAppSession(): AppSession {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useAppSession must be used within a session provider.");
  }
  return session;
}
