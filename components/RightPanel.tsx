"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import type { Profile } from "@/types";

interface TrendingPost {
  id: string;
  content: string;
  engagement: number;
  author?: Pick<Profile, "id" | "display_name" | "username" | "avatar_url">;
}

interface WhoToFollow {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

function initials(name?: string | null) {
  return (
    name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??"
  );
}

export function RightPanel() {
  const { user } = useSession();
  const [trending, setTrending] = useState<TrendingPost[]>([]);
  const [whoToFollow, setWhoToFollow] = useState<WhoToFollow[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Trending: posts sorted by engagement (reactions + comments + shares)
    supabase
      .from("posts")
      .select("id, content, like_count, comment_count, share_count, author:profiles(id, display_name, username, avatar_url)")
      .order("like_count", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!data) return;
        setTrending(
          data.map((p) => {
            const rawAuthor = Array.isArray(p.author) ? p.author[0] : p.author;
            const a = rawAuthor as { id: string; display_name: string; username: string; avatar_url: string | null } | null;
            return {
              id: p.id,
              content: p.content.slice(0, 60) + (p.content.length > 60 ? "…" : ""),
              engagement: (p.like_count ?? 0) + (p.comment_count ?? 0) + (p.share_count ?? 0),
              author: a ?? undefined,
            };
          })
        );
      });

    // Who to follow: newest accounts not already followed
    const loadWho = async () => {
      let excludeIds = [user?.id ?? "00000000-0000-0000-0000-000000000000"];

      if (user) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        const followedIds = (follows ?? []).map((f: { following_id: string }) => f.following_id);
        excludeIds = [...excludeIds, ...followedIds];
        setFollowingIds(new Set(followedIds));
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(4);

      setWhoToFollow(data ?? []);
    };
    loadWho();
  }, [user]);

  const handleFollow = async (targetId: string) => {
    if (!user) return;
    await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId }).then((r) => r);
    setFollowingIds((prev) => new Set([...prev, targetId]));
  };

  return (
    <aside className="hidden xl:flex w-72 flex-col gap-4 py-6 pl-2">
      {/* Trending tags */}
      <Card className="rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <h2 className="text-sm font-semibold text-foreground">🔥 Trending</h2>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1">
          {trending.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Loading trending posts…</p>
          ) : (
            trending.map((post) => (
              <div
                key={post.id}
                className="rounded-xl px-2 py-2 hover:bg-secondary transition-colors"
              >
                <p className="text-xs text-foreground/80 leading-snug line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-1 mt-1">
                  {post.author && (
                    <span className="text-[10px] text-paw-pink font-medium">@{post.author.username}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">· {post.engagement} engagements</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Who to follow */}
      <Card className="rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <h2 className="text-sm font-semibold text-foreground">🐾 Who to Follow</h2>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {whoToFollow.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              {user ? "You're following everyone! 😻" : "Sign in to see suggestions"}
            </p>
          ) : (
            whoToFollow.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Link href={`/profile/${u.username}`}>
                  <Avatar className="h-8 w-8 hover:ring-2 hover:ring-paw-pink/30 transition-all">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-catnip-green-light text-catnip-green text-xs font-semibold">
                      {initials(u.display_name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${u.username}`} className="hover:underline">
                    <p className="text-sm font-semibold truncate leading-tight">{u.display_name}</p>
                  </Link>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                {!followingIds.has(u.id) ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFollow(u.id)}
                    className="rounded-full border border-paw-pink px-3 py-0.5 text-xs font-semibold text-paw-pink hover:bg-paw-pink hover:text-white transition-colors"
                  >
                    Follow
                  </motion.button>
                ) : (
                  <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-muted-foreground">
                    Following
                  </span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="px-2 text-[11px] text-muted-foreground/60 leading-relaxed">
        PurrSpace · Made with 🐾 ·{" "}
        <Link href="/terms" className="hover:text-paw-pink transition-colors">Privacy & Terms</Link>
      </p>
    </aside>
  );
}
