"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CatPost } from "./CatPost";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import type { Post, Profile } from "@/types";

function initials(name?: string | null) {
  return (
    name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "??"
  );
}

interface WhoToFollow {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

/** Compact "Who to Follow" strip — mobile only (hidden on md+) */
function WhoToFollowMobile({ userId }: { userId?: string }) {
  const [suggestions, setSuggestions] = useState<WhoToFollow[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      let excludeIds = [userId ?? "00000000-0000-0000-0000-000000000000"];
      if (userId) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId);
        const followedIds = (follows ?? []).map((f: { following_id: string }) => f.following_id);
        excludeIds = [...excludeIds, ...followedIds];
        setFollowingIds(new Set(followedIds));
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(6);
      setSuggestions(data ?? []);
    };
    load();
  }, [userId]);

  const handleFollow = async (targetId: string) => {
    if (!userId) return;
    await supabase
      .from("follows")
      .insert({ follower_id: userId, following_id: targetId });
    setFollowingIds((prev) => new Set([...prev, targetId]));
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="md:hidden">
      <h2 className="text-sm font-semibold mb-3">🐾 Who to Follow</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {suggestions.map((u) => (
          <div
            key={u.id}
            className="flex flex-col items-center gap-1.5 min-w-[80px] rounded-2xl border border-border/60 bg-card px-3 py-3 text-center"
          >
            <Link href={`/profile/${u.username}`}>
              <Avatar className="h-11 w-11 ring-2 ring-paw-pink/20">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback className="bg-paw-pink-light text-paw-pink text-sm font-bold">
                  {initials(u.display_name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 w-full">
              <Link href={`/profile/${u.username}`}>
                <p className="text-xs font-semibold truncate leading-tight">{u.display_name}</p>
              </Link>
              <p className="text-[10px] text-muted-foreground truncate">@{u.username}</p>
            </div>
            {!followingIds.has(u.id) ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFollow(u.id)}
                className="rounded-full bg-paw-pink px-3 py-0.5 text-[10px] font-semibold text-white hover:bg-paw-pink/90 transition-colors"
              >
                Follow
              </motion.button>
            ) : (
              <span className="rounded-full bg-secondary px-3 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Following
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExploreView() {
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);
  const [trending, setTrending] = useState<Post[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load trending (top by engagement) on mount
  useEffect(() => {
    supabase
      .from("posts")
      .select("*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*))")
      .eq("archived", false)
      .order("like_count", { ascending: false })
      .limit(10)
      .then(async ({ data }) => {
        if (!data) return;
        let likedIds = new Set<string>();
        let reactionMap = new Map<string, string>();
        if (user) {
          const postIds = data.map((p) => p.id);
          const likeRes = await supabase
            .from("likes")
            .select("post_id, reaction_emoji")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          for (const l of likeRes.data ?? []) {
            likedIds.add(l.post_id);
            reactionMap.set(l.post_id, l.reaction_emoji);
          }
        }
        setTrending(
          data.map((p) => ({
            ...p,
            liked_by_me: likedIds.has(p.id),
            my_reaction: reactionMap.get(p.id) ?? null,
            pawmarked_by_me: false,
          }))
        );
        setTrendingLoading(false);
      });
  }, [user]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setUsers([]);
      setPosts([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const q = query.trim().toLowerCase();

      const [usersRes, postsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(8),
        supabase
          .from("posts")
          .select("*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*))")
          .eq("archived", false)
          .ilike("content", `%${q}%`)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      let likedIds = new Set<string>();
      let reactionMap = new Map<string, string>();
      const postData = postsRes.data ?? [];
      if (user && postData.length > 0) {
        const postIds = postData.map((p) => p.id);
        const likeRes = await supabase
          .from("likes")
          .select("post_id, reaction_emoji")
          .eq("user_id", user.id)
          .in("post_id", postIds);
        for (const l of likeRes.data ?? []) {
          likedIds.add(l.post_id);
          reactionMap.set(l.post_id, l.reaction_emoji);
        }
      }

      setUsers(usersRes.data ?? []);
      setPosts(
        postData.map((p) => ({
          ...p,
          liked_by_me: likedIds.has(p.id),
          my_reaction: reactionMap.get(p.id) ?? null,
          pawmarked_by_me: false,
        }))
      );
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user]);

  const hasResults = users.length > 0 || posts.length > 0;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">Explore 🔭</h1>

      {/* Search bar */}
      <div className="relative">
        <MagnifyingGlass
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users or posts…"
          className="w-full rounded-2xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-paw-pink/40 transition placeholder:text-muted-foreground/60"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="h-4 w-4 rounded-full border-2 border-paw-pink border-t-transparent"
            />
          </div>
        )}
      </div>

      {/* Search results */}
      <AnimatePresence mode="wait">
        {query.trim() ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Users */}
            {users.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">People</h2>
                {users.map((u) => (
                  <Link key={u.id} href={`/profile/${u.username}`}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 hover:shadow-sm transition-shadow"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-paw-pink/20">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-paw-pink-light text-paw-pink text-sm font-bold">
                          {initials(u.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">{u.display_name}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}

            {/* Posts */}
            {posts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">Posts</h2>
                {posts.map((post) => (
                  <CatPost key={post.id} post={post} />
                ))}
              </div>
            )}

            {!searching && !hasResults && (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                <span className="text-3xl">🔍</span>
                <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
              </div>
            )}
          </motion.div>
        ) : (
          /* Trending + Who to Follow */
          <motion.div
            key="trending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Suggested friends — mobile only */}
            <WhoToFollowMobile userId={user?.id} />

            <div className="space-y-3">
              <h2 className="text-sm font-semibold">🔥 Trending posts</h2>
              {trendingLoading
                ? [1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                  ))
                : trending.map((post) => <CatPost key={post.id} post={post} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
