"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CatPost } from "./CatPost";
import { EmptyState } from "./EmptyState";
import { PostSkeleton } from "./PostSkeleton";
import { supabase } from "@/lib/supabase";
import type { Post } from "@/types";

async function fetchPosts(userId?: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, author:profiles(*)")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) return [];

  // Fetch which posts the current user has liked
  let likedIds = new Set<string>();
  if (userId) {
    const { data: likes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", userId);
    likedIds = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
  }

  return data.map((p) => ({ ...p, liked_by_me: likedIds.has(p.id) }));
}

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadAndSubscribe = async () => {
      // Get current user (best-effort; feed is public either way)
      const { data: { user } } = await supabase.auth.getUser();
      const initial = await fetchPosts(user?.id);
      if (mounted) {
        setPosts(initial);
        setLoading(false);
      }

      // ── Realtime: posts table ──────────────────────────────
      channelRef.current = supabase
        .channel("public:posts")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "posts" },
          async (payload) => {
            // Fetch full post with author
            const { data } = await supabase
              .from("posts")
              .select("*, author:profiles(*)")
              .eq("id", payload.new.id)
              .single();
            if (data && mounted) {
              setPosts((prev) => [{ ...data, liked_by_me: false }, ...prev]);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "posts" },
          (payload) => {
            if (mounted)
              setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        )
        // ── Realtime: like_count updates ──────────────────────
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "posts" },
          (payload) => {
            if (mounted) {
              setPosts((prev) =>
                prev.map((p) =>
                  p.id === payload.new.id
                    ? { ...p, like_count: payload.new.like_count }
                    : p
                )
              );
            }
          }
        )
        .subscribe();
    };

    loadAndSubscribe();

    return () => {
      mounted = false;
      channelRef.current?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {posts.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState />
          </motion.div>
        ) : (
          posts.map((post, i) => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i < 5 ? i * 0.06 : 0, type: "spring", stiffness: 380, damping: 32 }}
            >
              <CatPost post={post} />
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
