"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowBendDownRight, FilmSlate, PaperPlaneTilt } from "@phosphor-icons/react";
import { CommentReactionButton } from "./CommentReactionButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { GifPicker } from "./GifPicker";
import type { Comment } from "@/types";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
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

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  onReply: (parentId: string, mentionName: string) => void;
  highlightCommentId?: string;
  postId: string;
}

function CommentItem({ comment, depth = 0, onReply, highlightCommentId, postId }: CommentItemProps) {
  const isTarget = comment.id === highlightCommentId;
  const itemRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState(isTarget);

  useEffect(() => {
    if (!isTarget) return;
    const scrollTimer = setTimeout(() => {
      itemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
    const fadeTimer = setTimeout(() => setHighlighted(false), 2500);
    return () => { clearTimeout(scrollTimer); clearTimeout(fadeTimer); };
  }, [isTarget]);

  return (
    <motion.div
      ref={itemRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "flex gap-2.5 rounded-xl transition-colors duration-700",
        depth > 0 && "ml-8 pl-3 border-l-2 border-border/40",
        highlighted && "bg-paw-pink/15"
      )}
    >
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarImage src={comment.author?.avatar_url ?? undefined} />
        <AvatarFallback className="bg-paw-pink-light text-paw-pink text-[10px] font-bold">
          {initials(comment.author?.display_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl bg-secondary px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold leading-tight">
              {comment.author?.display_name ?? "Anonymous"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              @{comment.author?.username}
            </span>
          </div>

          {/* GIF */}
          {comment.gif_url && (
            <div className="rounded-xl overflow-hidden mb-1 max-w-[200px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comment.gif_url}
                alt="GIF"
                className="w-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Text */}
          {comment.content && (
            <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>

          {/* Reaction button — tap for quick paw, hold for picker */}
          <CommentReactionButton
            commentId={comment.id}
            commentAuthorId={comment.author_id}
            postId={postId}
          />

          {depth === 0 && (
            <button
              onClick={() => onReply(comment.id, comment.author?.display_name ?? "someone")}
              className="text-[10px] text-muted-foreground hover:text-paw-pink transition-colors flex items-center gap-0.5"
            >
              <ArrowBendDownRight size={10} />
              Reply
            </button>
          )}
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={1}
                onReply={onReply}
                highlightCommentId={highlightCommentId}
                postId={postId}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface CommentsSectionProps {
  postId: string;
  commentCount: number;
  onCountChange?: (delta: number) => void;
  highlightCommentId?: string;
}

export function CommentsSection({
  postId,
  commentCount,
  onCountChange,
  highlightCommentId,
}: CommentsSectionProps) {
  const { user, profile } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  // Close gif picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputAreaRef.current && !inputAreaRef.current.contains(e.target as Node))
        setShowGifPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    supabase
      .from("comments")
      .select("*, author:profiles(*)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!mounted || !data) return;
        const topLevel: Comment[] = [];
        const byId: Record<string, Comment> = {};
        for (const c of data as Comment[]) {
          byId[c.id] = { ...c, replies: [] };
        }
        for (const c of Object.values(byId)) {
          if (c.parent_id && byId[c.parent_id]) {
            byId[c.parent_id].replies!.push(c);
          } else if (!c.parent_id) {
            topLevel.push(c);
          }
        }
        setComments(topLevel);
        setLoading(false);
      });

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        async (payload) => {
          if (!mounted) return;
          const { data } = await supabase
            .from("comments")
            .select("*, author:profiles(*)")
            .eq("id", payload.new.id)
            .single();
          if (!data || !mounted) return;
          const newComment = { ...data as Comment, replies: [] };
          setComments((prev) => {
            if (newComment.parent_id) {
              return prev.map((c) =>
                c.id === newComment.parent_id
                  ? {
                      ...c,
                      replies: (c.replies ?? []).some((r) => r.id === newComment.id)
                        ? c.replies!
                        : [...(c.replies ?? []), newComment],
                    }
                  : c
              );
            }
            if (prev.some((c) => c.id === newComment.id)) return prev;
            return [...prev, newComment];
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handleReply = (parentId: string, name: string) => {
    setReplyTo({ id: parentId, name });
    setText(`@${name} `);
    inputRef.current?.focus();
  };

  const canSubmit = !submitting && (text.trim().length > 0 || gifUrl !== null);

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);

    const content = text.trim();
    const parentId = replyTo?.id ?? null;
    const gif = gifUrl;

    // Optimistic entry
    const optimistic: Comment = {
      id: `opt-${Date.now()}`,
      post_id: postId,
      author_id: user.id,
      parent_id: parentId,
      content,
      gif_url: gif,
      created_at: new Date().toISOString(),
      author: profile ?? undefined,
      replies: [],
    };

    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: [...(c.replies ?? []), optimistic] } : c
        )
      );
    } else {
      setComments((prev) => [...prev, optimistic]);
    }
    onCountChange?.(1);
    setText("");
    setGifUrl(null);
    setShowGifPicker(false);
    setReplyTo(null);

    try {
      const { data: inserted, error } = await supabase
        .from("comments")
        .insert({ post_id: postId, author_id: user.id, parent_id: parentId, content, gif_url: gif })
        .select("*, author:profiles(*)")
        .single();

      if (error) throw error;

      const real: Comment = { ...(inserted as Comment), replies: [] };
      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies ?? []).map((r) => r.id === optimistic.id ? real : r) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.map((c) => c.id === optimistic.id ? real : c));
      }
    } catch {
      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== optimistic.id) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      }
      onCountChange?.(-1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 border-t border-border/40 pt-3 space-y-3">
      {loading ? (
        <p className="text-xs text-muted-foreground px-1">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">No comments yet. Be first! 🐾</p>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                onReply={handleReply}
                highlightCommentId={highlightCommentId}
                postId={postId}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {user && (
        <div ref={inputAreaRef} className="relative flex items-start gap-2">
          <Avatar className="h-7 w-7 shrink-0 mt-1">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-paw-pink-light text-paw-pink text-[10px] font-bold">
              {initials(profile?.display_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1.5">
            {/* GIF preview */}
            {gifUrl && (
              <div className="relative inline-block rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gifUrl} alt="Selected GIF" className="max-h-28 rounded-xl object-cover" />
                <button
                  onClick={() => setGifUrl(null)}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-[10px] hover:bg-black/80 transition-colors"
                  aria-label="Remove GIF"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 rounded-2xl bg-secondary px-3 py-1.5">
              {replyTo && (
                <span className="text-[10px] text-paw-pink font-semibold shrink-0">
                  @{replyTo.name}
                </span>
              )}
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                placeholder={replyTo ? `Reply to @${replyTo.name}…` : "Add a comment… 🐾"}
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
              />

              {/* GIF button */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setShowGifPicker((v) => !v)}
                className={cn(
                  "transition-colors",
                  showGifPicker ? "text-paw-pink" : "text-muted-foreground hover:text-paw-pink"
                )}
                aria-label="Add GIF"
                type="button"
              >
                <FilmSlate size={15} weight={showGifPicker ? "fill" : "duotone"} />
              </motion.button>

              {/* Send button */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="text-paw-pink disabled:opacity-40 transition-opacity"
                aria-label="Post comment"
              >
                <PaperPlaneTilt size={15} weight="fill" />
              </motion.button>
            </div>
          </div>

          {replyTo && (
            <button
              onClick={() => { setReplyTo(null); setText(""); }}
              className="text-[10px] text-muted-foreground hover:text-foreground mt-2"
            >
              ✕
            </button>
          )}

          {/* GIF Picker */}
          <AnimatePresence>
            {showGifPicker && (
              <GifPicker
                onSelect={(url) => {
                  setGifUrl(url);
                  setShowGifPicker(false);
                }}
                onClose={() => setShowGifPicker(false)}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
