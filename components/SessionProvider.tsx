"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
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

  const refreshProfile = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s) {
      const p = await fetchProfile(s.user.id);
      setProfile(p);
    }
  }, []);

  useEffect(() => {
    // Load initial session once
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setProfile(s ? await fetchProfile(s.user.id) : null);
      setLoading(false);
    });

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
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
