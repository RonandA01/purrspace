"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatCircle, ArrowsCounterClockwise, DotsThree, Trash } from "@phosphor-icons/react";
import { ReactionsButton } from "./ReactionsButton";
import { CommentsSection } from "./CommentsSection";
import { ShareButton } from "./ShareButton";
import { PawmarkButton } from "./PawmarkButton";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import type { Post } from "@/types";
import { cn } from "@/lib/utils";

interface CatPostProps {
  post: Post;
  className?: string;
  alwaysShowComments?: boolean;
  highlightCommentId?: string;
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

export function CatPost({ post, className, alwaysShowComments = false, highlightCommentId }: CatPostProps) {
  const { user } = useSession();
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [myReaction, setMyReaction] = useState<string | null>(post.my_reaction ?? null);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [shareCount, setShareCount] = useState(post.share_count ?? 0);
  const [pawmarked, setPawmarked] = useState(post.pawmarked_by_me ?? false);
  const [showComments, setShowComments] = useState(alwaysShowComments);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwn = Boolean(user && user.id === post.author_id);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDelete = async () => {
    if (!user || deleting) return;
    setDeleting(true);
    setMenuOpen(false);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error("Failed to delete post.");
      setDeleting(false);
    } else {
      window.dispatchEvent(new CustomEvent("purrspace:remove-post", { detail: { id: post.id } }));
      toast("Post deleted 🗑️");
    }
  };

  const handleReactionChange = (emoji: string | null, delta: number) => {
    setMyReaction(emoji);
    setLikeCount((c) => Math.max(0, c + delta));
  };

  const isRepost = Boolean(post.shared_from_id);
  const displayAuthor = post.author;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={cn("w-full", className)}
    >
      <Card className="rounded-3xl border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-200">

        {/* Repost banner */}
        {isRepost && post.shared_from && (
          <div className="flex items-center gap-1.5 px-5 pt-3 text-[11px] text-muted-foreground">
            <ArrowsCounterClockwise size={11} weight="bold" />
            <span>
              <span className="font-semibold text-foreground/80">{displayAuthor?.display_name ?? "Someone"}</span>
              {" shared "}
              <span className="font-semibold text-foreground/80">{post.shared_from.author?.display_name ?? "someone"}</span>
              {"'s post"}
            </span>
          </div>
        )}

        <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-4 px-5">
          <Link href={`/profile/${displayAuthor?.username ?? ""}`}>
            <Avatar className="h-10 w-10 ring-2 ring-paw-pink/30 hover:ring-paw-pink/60 transition-all">
              <AvatarImage
                src={displayAuthor?.avatar_url ?? undefined}
                alt={displayAuthor?.display_name}
              />
              <AvatarFallback className="bg-paw-pink-light text-paw-pink font-semibold text-sm">
                {initials(displayAuthor?.display_name)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <Link href={`/profile/${displayAuthor?.username ?? ""}`} className="hover:underline">
              <p className="font-semibold text-sm leading-tight truncate">
                {displayAuthor?.display_name ?? "Anonymous"}
              </p>
            </Link>
            <p className="text-xs text-muted-foreground">
              @{displayAuthor?.username ?? "unknown"} ·{" "}
              {formatRelativeTime(post.created_at)}
            </p>
          </div>

          {/* Owner actions menu */}
          {isOwn && (
            <div className="relative shrink-0" ref={menuRef}>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="Post options"
              >
                <DotsThree size={18} weight="bold" />
              </motion.button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ type: "spring", stiffness: 600, damping: 28 }}
                    className="absolute right-0 top-8 z-50 min-w-[140px] rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden"
                  >
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                    >
                      <Trash size={14} weight="duotone" />
                      {deleting ? "Deleting…" : "Delete post"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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

          {/* Shared original post preview */}
          {isRepost && post.shared_from && (
            <div className="rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={post.shared_from.author?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-paw-pink-light text-paw-pink text-[9px] font-bold">
                    {initials(post.shared_from.author?.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold">
                  {post.shared_from.author?.display_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  @{post.shared_from.author?.username}
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
                {post.shared_from.content}
              </p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 pt-1 -mx-1">
            {/* Reactions — hold for picker, tap for paw */}
            <ReactionsButton
              postId={post.id}
              myReaction={myReaction}
              count={likeCount}
              onReactionChange={handleReactionChange}
            />

            {/* Comments toggle */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 600, damping: 20 }}
              onClick={() => setShowComments((s) => !s)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                showComments
                  ? "bg-catnip-green/20 text-catnip-green"
                  : "text-muted-foreground hover:bg-catnip-green/15 hover:text-catnip-green"
              )}
              aria-label="Toggle comments"
            >
              <ChatCircle size={16} weight={showComments ? "fill" : "duotone"} />
              {commentCount > 0 && <span>{commentCount}</span>}
            </motion.button>

            {/* Share */}
            <ShareButton
              post={post}
              shareCount={shareCount}
              onShare={() => setShareCount((c) => c + 1)}
            />

            {/* Pawmark — pinned right */}
            <div className="ml-auto">
              <PawmarkButton
                postId={post.id}
                pawmarked={pawmarked}
                onToggle={setPawmarked}
              />
            </div>
          </div>

          {/* Comments section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                key="comments"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              >
                <CommentsSection
                  postId={post.id}
                  commentCount={commentCount}
                  onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
                  highlightCommentId={highlightCommentId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
