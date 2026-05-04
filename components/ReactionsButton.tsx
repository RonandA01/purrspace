"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { REACTIONS, reactionEmoji } from "@/types";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { ReactorsModal } from "./ReactorsModal";

interface ReactionsButtonProps {
  postId: string;
  myReaction: string | null;   // DB value: 'like' | 'haha' | 'love' | 'wow' | 'sad' | 'angry' | null
  count: number;
  onReactionChange?: (value: string | null, delta: number) => void;
}

export function ReactionsButton({
  postId,
  myReaction,
  count,
  onReactionChange,
}: ReactionsButtonProps) {
  const { user } = useSession();
  const [current, setCurrent] = useState<string | null>(myReaction);
  const [localCount, setLocalCount] = useState(count);
  const [pending, setPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCurrent(myReaction); }, [myReaction]);
  useEffect(() => { setLocalCount(count); }, [count]);

  // Close picker on outside click
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

    const wasReacted = current !== null;
    const isSame = current === value;

    // Optimistic update
    if (isSame) {
      setCurrent(null);
      setLocalCount((c) => Math.max(0, c - 1));
      onReactionChange?.(null, -1);
    } else {
      setCurrent(value);
      setLocalCount((c) => wasReacted ? c : c + 1);
      onReactionChange?.(value, wasReacted ? 0 : 1);
    }

    try {
      if (isSame) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else if (wasReacted) {
        await supabase
          .from("likes")
          .update({ reaction_emoji: value })
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: user.id, reaction_emoji: value });
      }
    } catch {
      // Revert on error
      setCurrent(myReaction);
      setLocalCount(count);
      onReactionChange?.(myReaction, 0);
    } finally {
      setPending(false);
    }
  };

  const handleClick = () => {
    if (!user) return;
    if (current) {
      applyReaction(current); // tap active = remove
    } else {
      applyReaction("like");  // tap empty = quick paw
    }
  };

  const handleMouseDown = () => {
    if (!user) return;
    const timer = setTimeout(() => setPickerOpen(true), 400);
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const displayEmoji = reactionEmoji(current);
  const isActive = current !== null;

  return (
    <>
      <div className="relative flex items-center gap-0.5" ref={containerRef}>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 600, damping: 20 }}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          disabled={pending || !user}
          style={{ WebkitTouchCallout: "none" }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors select-none",
            isActive
              ? "bg-paw-pink/15 text-paw-pink font-semibold"
              : "text-muted-foreground hover:bg-paw-pink/10 hover:text-paw-pink"
          )}
          aria-label="React"
        >
          <span className="text-base leading-none">{displayEmoji}</span>
        </motion.button>

        {/* Clickable count opens ReactorsModal */}
        {localCount > 0 && (
          <button
            onClick={() => setShowReactors(true)}
            className={cn(
              "rounded-full px-1.5 py-1.5 text-sm transition-colors hover:bg-paw-pink/10",
              isActive ? "text-paw-pink font-semibold" : "text-muted-foreground"
            )}
          >
            {localCount}
          </button>
        )}

        {/* Reaction picker */}
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              className="absolute bottom-10 left-0 z-50 flex items-center gap-1 rounded-2xl border border-border/60 bg-card px-2 py-2.5 shadow-lg"
            >
              {REACTIONS.map(({ value, emoji, label }) => (
                <motion.button
                  key={value}
                  whileHover={{ scale: 1.25, y: -6 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 700, damping: 18 }}
                  onClick={() => applyReaction(value)}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ WebkitTouchCallout: "none" }}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 transition-colors select-none",
                    current === value ? "bg-paw-pink/20" : "hover:bg-secondary"
                  )}
                  aria-label={label}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  <span className="text-[9px] font-semibold text-muted-foreground leading-none whitespace-nowrap">
                    {label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reactors modal */}
      <ReactorsModal
        postId={postId}
        open={showReactors}
        onClose={() => setShowReactors(false)}
      />
    </>
  );
}
