"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { REACTIONS, reactionEmoji } from "@/types";
import type { Profile } from "@/types";

interface Reactor {
  user_id: string;
  reaction_emoji: string;   // DB value: 'like' | 'haha' | etc.
  profile: Pick<Profile, "id" | "display_name" | "username" | "avatar_url"> | null;
}

interface ReactorsModalProps {
  postId: string;
  open: boolean;
  onClose: () => void;
}

function initials(name?: string | null) {
  return name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??";
}

export function ReactorsModal({ postId, open, onClose }: ReactorsModalProps) {
  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [filter, setFilter] = useState<string | null>(null);  // null = all
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFilter(null);

    supabase
      .from("likes")
      .select("user_id, reaction_emoji, profile:profiles(id, display_name, username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        setReactors(
          data.map((row) => {
            const raw = Array.isArray(row.profile) ? row.profile[0] : row.profile;
            return {
              user_id: row.user_id,
              reaction_emoji: row.reaction_emoji,
              profile: raw as Reactor["profile"],
            };
          })
        );
        setLoading(false);
      });
  }, [open, postId]);

  const displayed = filter
    ? reactors.filter((r) => r.reaction_emoji === filter)
    : reactors;

  // Tally counts per reaction type
  const counts: Record<string, number> = {};
  for (const r of reactors) {
    counts[r.reaction_emoji] = (counts[r.reaction_emoji] ?? 0) + 1;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border/60 bg-card shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <h2 className="font-bold text-sm">Reactions</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Filter tabs */}
            {reactors.length > 0 && (
              <div className="flex items-center gap-1 px-4 pt-3 pb-1 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setFilter(null)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                    filter === null
                      ? "bg-paw-pink/20 text-paw-pink"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All {reactors.length}
                </button>
                {REACTIONS.filter((r) => counts[r.value] > 0).map(({ value, emoji, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilter(filter === value ? null : value)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                      filter === value
                        ? "bg-paw-pink/20 text-paw-pink"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {emoji} {counts[value]}
                  </button>
                ))}
              </div>
            )}

            {/* List */}
            <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
              ) : displayed.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No reactions yet</p>
              ) : (
                displayed.map((r) => (
                  <div key={r.user_id} className="flex items-center gap-3">
                    <Link href={`/profile/${r.profile?.username ?? ""}`} onClick={onClose}>
                      <Avatar className="h-8 w-8 hover:ring-2 hover:ring-paw-pink/30 transition-all">
                        <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
                          {initials(r.profile?.display_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${r.profile?.username ?? ""}`} onClick={onClose} className="hover:underline">
                        <p className="text-sm font-semibold leading-tight truncate">
                          {r.profile?.display_name ?? "Unknown"}
                        </p>
                      </Link>
                      <p className="text-xs text-muted-foreground">@{r.profile?.username ?? "unknown"}</p>
                    </div>
                    <span className="text-lg shrink-0" title={r.reaction_emoji}>
                      {reactionEmoji(r.reaction_emoji)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
