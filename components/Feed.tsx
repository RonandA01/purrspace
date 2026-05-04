"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CatPost } from "./CatPost";
import { EmptyState } from "./EmptyState";
import { PostSkeleton } from "./PostSkeleton";
import { supabase } from "@/lib/supabase";
import type { Post } from "@/types";

const PAGE_SIZE = 15;

async function fetchPosts(
  userId: string | undefined,
  lastCreatedAt: string | null
): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*))")
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (lastCreatedAt) {
    query = query.lt("created_at", lastCreatedAt);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  let likedIds = new Set<string>();
  let reactionMap = new Map<string, string>();
  let pawmarkedIds = new Set<string>();

  if (userId && data.length > 0) {
    const postIds = data.map((p) => p.id);

    const [likeRes, pawmarkRes] = await Promise.all([
      supabase
        .from("likes")
        .select("post_id, reaction_emoji")
        .eq("user_id", userId)
        .in("post_id", postIds),
      supabase
        .from("pawmarks")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds),
    ]);

    for (const l of likeRes.data ?? []) {
      likedIds.add(l.post_id);
      reactionMap.set(l.post_id, l.reaction_emoji);
    }
    for (const p of pawmarkRes.data ?? []) {
      pawmarkedIds.add(p.post_id);
    }
  }

  return data.map((p) => ({
    ...p,
    liked_by_me: likedIds.has(p.id),
    my_reaction: reactionMap.get(p.id) ?? null,
    pawmarked_by_me: pawmarkedIds.has(p.id),
  }));
}

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string | undefined>(undefined);

  // ── Initial load + realtime ─────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const loadAndSubscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userIdRef.current = user?.id;

      const initial = await fetchPosts(user?.id, null);
      if (!mounted) return;

      setPosts(initial);
      setHasMore(initial.length === PAGE_SIZE);
      setLoading(false);

      // ── Realtime ──────────────────────────────────────────
      const channel = supabase
        .channel("public:posts:feed")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "posts" },
          async (payload) => {
            if (!mounted) return;
            const { data } = await supabase
              .from("posts")
              .select("*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*))")
              .eq("id", payload.new.id)
              .single();
            if (data && mounted) {
              const newPost: Post = {
                ...data,
                liked_by_me: false,
                my_reaction: null,
                pawmarked_by_me: false,
              };
              setPosts((prev) => {
                // Skip if already present (optimistic duplicate)
                if (prev.some((p) => p.id === newPost.id)) return prev;
                return [newPost, ...prev];
              });
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
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "posts" },
          (payload) => {
            if (mounted)
              setPosts((prev) =>
                prev.map((p) =>
                  p.id === payload.new.id
                    ? {
                        ...p,
                        like_count: payload.new.like_count,
                        comment_count: payload.new.comment_count,
                        share_count: payload.new.share_count,
                      }
                    : p
                )
              );
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    // Listen for optimistic post event from ComposeBox
    const handleOptimisticPost = (e: Event) => {
      const post = (e as CustomEvent<Post>).detail;
      setPosts((prev) => {
        if (prev.some((p) => p.id === post.id)) return prev;
        return [post, ...prev];
      });
    };
    const handleRemovePost = (e: Event) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    };
    window.addEventListener("purrspace:new-post", handleOptimisticPost);
    window.addEventListener("purrspace:remove-post", handleRemovePost);

    loadAndSubscribe();

    return () => {
      mounted = false;
      window.removeEventListener("purrspace:new-post", handleOptimisticPost);
      window.removeEventListener("purrspace:remove-post", handleRemovePost);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // ── Alt+Tab: refetch on tab visibility ─────────────────────
  useEffect(() => {
    const handleVisible = async () => {
      console.log("[FEED] visibilityState:", document.visibilityState);
      if (document.visibilityState !== "visible") return;
      console.log("[FEED] Tab became visible — refetching feed");
      console.log("[FEED] Fetch started");
      // Use cached userId — avoids acquiring the auth lock while Supabase is
      // simultaneously refreshing the token, which caused the 5000ms lock warning.
      const fresh = await fetchPosts(userIdRef.current, null);
      console.log("[FEED] Fetch completed:", fresh.length, "posts");
      setPosts(fresh);
      setHasMore(fresh.length === PAGE_SIZE);
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, []);

  // ── Infinite scroll sentinel ────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    const lastPost = posts[posts.length - 1];
    const more = await fetchPosts(userIdRef.current, lastPost.created_at);
    setHasMore(more.length === PAGE_SIZE);
    setPosts((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...more.filter((p) => !ids.has(p.id))];
    });
    setLoadingMore(false);
  }, [loadingMore, hasMore, posts]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <PostSkeleton key={i} />
        ))}
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
              transition={{
                delay: i < 5 ? i * 0.06 : 0,
                type: "spring",
                stiffness: 380,
                damping: 32,
              }}
            >
              <CatPost post={post} />
            </motion.div>
          ))
        )}
      </AnimatePresence>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {loadingMore && (
        <div className="space-y-4 pb-4">
          {[1, 2].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          You&apos;ve reached the end of the feed 🐾
        </p>
      )}
    </div>
  );
}
