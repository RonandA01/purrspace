"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PawPrintIcon } from "./PawPrintIcon";
import { cn } from "@/lib/utils";

interface Particle {
  id: number;
  x: number;
  y: number;
  rot: number;
}

interface PawLikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  disabled?: boolean;
}

export function PawLikeButton({ liked, count, onToggle, disabled }: PawLikeButtonProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);

  const handleClick = useCallback(() => {
    if (disabled) return;
    onToggle();
    if (!liked) {
      const burst: Particle[] = Array.from({ length: 5 }, (_, i) => ({
        id: nextId.current++,
        x: (Math.random() - 0.5) * 48,
        y: -(20 + Math.random() * 30),
        rot: Math.random() * 60 - 30,
      }));
      setParticles((p) => [...p, ...burst]);
      setTimeout(() => {
        setParticles((p) => p.filter((pt) => !burst.some((b) => b.id === pt.id)));
      }, 1000);
    }
  }, [liked, onToggle, disabled]);

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <motion.button
        onClick={handleClick}
        disabled={disabled}
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
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
          animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, type: "spring" }}
        >
          <PawPrintIcon size={16} />
        </motion.span>
        <span>{count}</span>
      </motion.button>

      {/* Burst particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: p.rot }}
            animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.3, rotate: p.rot + 30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="pointer-events-none absolute left-3 top-1 text-paw-pink"
          >
            <PawPrintIcon size={13} />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
