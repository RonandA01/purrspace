"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

interface SessionState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data ?? null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Ref to track current user ID without stale-closure issues
  const currentUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => { currentUserIdRef.current = user?.id; }, [user]);

  const refreshProfile = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s) {
      const p = await fetchProfile(s.user.id);
      setProfile(p);
    }
  }, []);

  // ── Alt+Tab debug ─────────────────────────────────────────
  useEffect(() => {
    const handler = () =>
      console.log("[SESSION] visibilityState:", document.visibilityState);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    // Load initial session once
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setProfile(s ? await fetchProfile(s.user.id) : null);
      setLoading(false);
    });

    // Listen for auth state changes (sign-in, sign-out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        console.log("[SESSION] onAuthStateChange:", event);

        // INITIAL_SESSION is already handled by getSession() above.
        if (event === "INITIAL_SESSION") return;

        // TOKEN_REFRESHED and SIGNED_IN both fire on tab focus after a token
        // refresh. If it's the same user, just swap the session object — do NOT
        // re-fetch profile or touch loading state (avoids the data-flash).
        if (
          event === "TOKEN_REFRESHED" ||
          (event === "SIGNED_IN" && s?.user.id === currentUserIdRef.current)
        ) {
          setSession(s);
          setUser(s?.user ?? null); // update the user object (token may have changed)
          return;
        }

        // Genuine sign-in (new user) or sign-out
        setSession(s);
        setUser(s?.user ?? null);
        setProfile(s ? await fetchProfile(s.user.id) : null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, user, profile, loading, refreshProfile }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
