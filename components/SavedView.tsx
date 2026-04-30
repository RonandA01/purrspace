"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookmarkSimple } from "@phosphor-icons/react";
import { CatPost } from "./CatPost";
import { PostSkeleton } from "./PostSkeleton";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import type { Post } from "@/types";

export function SavedView() {
  const { user } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from("pawmarks")
      .select("post_id, posts:post_id(*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*)))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }

        const rawPosts = data
          .map((r: { posts: unknown }) => r.posts)
          .filter(Boolean) as Post[];

        // Fetch reactions
        const postIds = rawPosts.map((p) => p.id);
        let reactionMap = new Map<string, string>();
        if (postIds.length > 0) {
          const { data: likes } = await supabase
            .from("likes")
            .select("post_id, reaction_emoji")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          for (const l of likes ?? []) reactionMap.set(l.post_id, l.reaction_emoji);
        }

        setPosts(
          rawPosts.map((p) => ({
            ...p,
            liked_by_me: reactionMap.has(p.id),
            my_reaction: reactionMap.get(p.id) ?? null,
            pawmarked_by_me: true,
          }))
        );
        setLoading(false);
      });
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
        <BookmarkSimple size={40} weight="duotone" />
        <p className="text-sm">Sign in to see your Pawmarks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold">Pawmarks</h1>
        <span className="text-muted-foreground text-sm">· your saved posts</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground"
        >
          <span className="text-4xl">🐾</span>
          <p className="font-semibold">Nothing saved yet</p>
          <p className="text-sm">Tap the bookmark icon on any post to save it here.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <CatPost key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
