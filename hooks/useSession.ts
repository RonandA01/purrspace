"use client";

import { useCallback, useEffect, useState } from "react";
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

export function useSession(): SessionState {
  const [state, setState] = useState<Omit<SessionState, "refreshProfile">>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  });

  const fetchAndSetProfile = useCallback(async (userId: string) => {
    const profile = await fetchProfile(userId);
    setState((prev) => ({ ...prev, profile }));
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await fetchAndSetProfile(session.user.id);
  }, [fetchAndSetProfile]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const profile = session ? await fetchProfile(session.user.id) : null;
      setState({ session, user: session?.user ?? null, profile, loading: false });
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const profile = session ? await fetchProfile(session.user.id) : null;
        setState({ session, user: session?.user ?? null, profile, loading: false });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { ...state, refreshProfile };
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data ?? null;
}
