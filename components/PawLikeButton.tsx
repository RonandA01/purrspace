"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PawPrintIcon } from "./PawPrintIcon";
import { usePawParticles } from "@/hooks/usePawParticles";
import { cn } from "@/lib/utils";

interface PawLikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  disabled?: boolean;
}

export function PawLikeButton({ liked, count, onToggle, disabled }: PawLikeButtonProps) {
  const { particles, burst } = usePawParticles();

  const handleClick = useCallback(() => {
    if (disabled) return;
    onToggle();
    if (!liked) burst();   // only burst on like, not unlike
  }, [liked, onToggle, disabled, burst]);

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <motion.button
        onClick={handleClick}
        disabled={disabled}
        whileTap={{ scale: 0.82 }}
        whileHover={{ scale: 1.12 }}
        transition={{ type: "spring", stiffness: 600, damping: 20 }}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          liked
            ? "bg-paw-pink/20 text-paw-pink"
            : "text-muted-foreground hover:bg-paw-pink/10 hover:text-paw-pink",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label={liked ? "Unlike" : "Like"}
        aria-pressed={liked}
      >
        <motion.span
          animate={liked ? { scale: [1, 1.5, 1], rotate: [0, -15, 10, 0] } : { scale: 1 }}
          transition={{ duration: 0.4, type: "spring" }}
        >
          <PawPrintIcon size={16} />
        </motion.span>
        <motion.span
          key={count}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 24 }}
        >
          {count}
        </motion.span>
      </motion.button>

      {/* Paw-print particle burst */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: p.scale, rotate: p.rot }}
            animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.1, rotate: p.rot + 45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.4, 1] }}
            className="pointer-events-none absolute left-3 top-1 text-paw-pink"
          >
            <PawPrintIcon size={14} />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
