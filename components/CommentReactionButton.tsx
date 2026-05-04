"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { REACTIONS, reactionEmoji } from "@/types";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";

interface CommentReactionButtonProps {
  commentId: string;
  commentAuthorId: string;
  postId: string;
}

export function CommentReactionButton({
  commentId,
  commentAuthorId,
  postId,
}: CommentReactionButtonProps) {
  const { user } = useSession();
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load initial state
  useEffect(() => {
    supabase
      .from("comment_reactions")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", commentId)
      .then(({ count: c }) => setCount(c ?? 0));

    if (user) {
      supabase
        .from("comment_reactions")
        .select("reaction_type")
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setMyReaction(data?.reaction_type ?? null));
    }
  }, [commentId, user]);

  // Close picker on outside click/tap
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyReaction = async (value: string) => {
    if (!user || pending) return;
    setPickerOpen(false);
    setPending(true);

    const prevReaction = myReaction;
    const prevCount = count;
    const wasReacted = myReaction !== null;
    const isSame = myReaction === value;

    // Optimistic update
    if (isSame) {
      setMyReaction(null);
      setCount((c) => Math.max(0, c - 1));
    } else {
      setMyReaction(value);
      setCount((c) => (wasReacted ? c : c + 1));
    }

    try {
      if (isSame) {
        await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else if (wasReacted) {
        await supabase
          .from("comment_reactions")
          .update({ reaction_type: value })
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("comment_reactions")
          .insert({ comment_id: commentId, user_id: user.id, reaction_type: value });

        // Notify comment author (skip self-reactions)
        if (commentAuthorId !== user.id) {
          await supabase.from("notifications").insert({
            user_id: commentAuthorId,
            actor_id: user.id,
            type: "comment_reaction",
            comment_id: commentId,
            post_id: postId,
          });
        }
      }
    } catch {
      // Revert on error
      setMyReaction(prevReaction);
      setCount(prevCount);
    } finally {
      setPending(false);
    }
  };

  const handleClick = () => {
    if (!user) return;
    applyReaction(myReaction ? myReaction : "like");
  };

  const handlePressStart = () => {
    if (!user) return;
    longPressRef.current = setTimeout(() => setPickerOpen(true), 400);
  };

  const handlePressEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const isActive = myReaction !== null;

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={handleClick}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onContextMenu={(e) => e.preventDefault()}
        disabled={pending || !user}
        style={{ WebkitTouchCallout: "none" }}
        className={cn(
          "flex items-center gap-1 text-[10px] transition-colors select-none",
          isActive
            ? "text-paw-pink font-semibold"
            : "text-muted-foreground hover:text-paw-pink"
        )}
        aria-label="React to comment"
      >
        <span className="text-sm leading-none">{reactionEmoji(myReaction)}</span>
        {count > 0 && <span>{count}</span>}
      </motion.button>

      {/* Reaction picker */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 6 }}
            transition={{ type: "spring", stiffness: 600, damping: 28 }}
            className="absolute bottom-7 left-0 z-50 flex items-center gap-1 rounded-2xl border border-border/60 bg-card px-2 py-2 shadow-xl"
          >
            {REACTIONS.map(({ value, emoji, label }) => (
              <motion.button
                key={value}
                whileHover={{ scale: 1.3, y: -4 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 700, damping: 18 }}
                onClick={() => applyReaction(value)}
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitTouchCallout: "none" }}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-0.5 transition-colors select-none",
                  myReaction === value ? "bg-paw-pink/20" : "hover:bg-secondary"
                )}
                aria-label={label}
              >
                <span className="text-lg leading-none">{emoji}</span>
                <span className="text-[8px] font-semibold text-muted-foreground leading-none whitespace-nowrap">
                  {label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
