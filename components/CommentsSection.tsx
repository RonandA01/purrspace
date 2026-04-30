"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowBendDownRight, PaperPlaneTilt } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
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
}

function CommentItem({ comment, depth = 0, onReply }: CommentItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn("flex gap-2.5", depth > 0 && "ml-8 pl-3 border-l-2 border-border/40")}
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
          <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          {depth === 0 && (
            <button
              onClick={() =>
                onReply(comment.id, comment.author?.display_name ?? "someone")
              }
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
              <CommentItem key={reply.id} comment={reply} depth={1} onReply={onReply} />
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
}

export function CommentsSection({ postId, commentCount, onCountChange }: CommentsSectionProps) {
  const { user, profile } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        // Build tree: top-level + nested replies
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

    // Realtime
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
                  ? { ...c, replies: [...(c.replies ?? []), newComment] }
                  : c
              );
            }
            // avoid duplicate optimistic entry
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

  const handleSubmit = async () => {
    if (!user || !text.trim() || submitting) return;
    setSubmitting(true);

    const content = text.trim();
    const parentId = replyTo?.id ?? null;

    // Optimistic
    const optimistic: Comment = {
      id: `opt-${Date.now()}`,
      post_id: postId,
      author_id: user.id,
      parent_id: parentId,
      content,
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
    setReplyTo(null);

    try {
      const { error } = await supabase
        .from("comments")
        .insert({ post_id: postId, author_id: user.id, parent_id: parentId, content })
        .then((r) => r);

      if (error) throw error;
    } catch {
      // Revert optimistic entry
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
              <CommentItem key={c.id} comment={c} onReply={handleReply} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {user && (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-paw-pink-light text-paw-pink text-[10px] font-bold">
              {initials(profile?.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center gap-1 rounded-2xl bg-secondary px-3 py-1.5">
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
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="text-paw-pink disabled:opacity-40 transition-opacity"
              aria-label="Post comment"
            >
              <PaperPlaneTilt size={15} weight="fill" />
            </motion.button>
          </div>
          {replyTo && (
            <button
              onClick={() => { setReplyTo(null); setText(""); }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
