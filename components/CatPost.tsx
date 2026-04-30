"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChatCircle, ShareNetwork, BookmarkSimple } from "@phosphor-icons/react";
import { PawLikeButton } from "./PawLikeButton";
import { supabase } from "@/lib/supabase";
import type { Post } from "@/types";
import { cn } from "@/lib/utils";

interface CatPostProps {
  post: Post;
  className?: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CatPost({ post, className }: CatPostProps) {
  const [liked, setLiked] = useState(post.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [pending, setPending] = useState(false);

  const handleLikeToggle = async () => {
    if (pending) return;

    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    setPending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Revert if not logged in
        setLiked(wasLiked);
        setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
        return;
      }

      if (wasLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("likes")
          .insert({ post_id: post.id, user_id: user.id });
      }
    } catch {
      // Revert on error
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setPending(false);
    }
  };

  const initials =
    post.author?.display_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "??";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={cn("w-full", className)}
    >
      <Card className="rounded-3xl border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4 px-5">
          <Avatar className="h-10 w-10 ring-2 ring-paw-pink/30">
            <AvatarImage
              src={post.author?.avatar_url ?? undefined}
              alt={post.author?.display_name}
            />
            <AvatarFallback className="bg-paw-pink-light text-paw-pink font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">
              {post.author?.display_name ?? "Anonymous"}
            </p>
            <p className="text-xs text-muted-foreground">
              @{post.author?.username ?? "unknown"} ·{" "}
              {formatRelativeTime(post.created_at)}
            </p>
          </div>

          <Badge
            variant="outline"
            className="text-[10px] border-catnip-green text-catnip-green rounded-full px-2"
          >
            🐱
          </Badge>
        </CardHeader>

        <CardContent className="px-5 pb-4 space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {post.content}
          </p>

          {post.image_url && (
            <div className="rounded-2xl overflow-hidden border border-border/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image_url}
                alt="Post attachment"
                className="w-full object-cover max-h-80"
                loading="lazy"
              />
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 pt-1 -mx-1">
            <PawLikeButton
              liked={liked}
              count={likeCount}
              onToggle={handleLikeToggle}
              disabled={pending}
            />

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 600, damping: 20 }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-catnip-green/15 hover:text-catnip-green transition-colors"
              aria-label="Comment"
            >
              <ChatCircle size={16} weight="duotone" />
              <span>Reply</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 600, damping: 20 }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="Share"
            >
              <ShareNetwork size={16} weight="duotone" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 600, damping: 20 }}
              className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="Save"
            >
              <BookmarkSimple size={16} weight="duotone" />
            </motion.button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
