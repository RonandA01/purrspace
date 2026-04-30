"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShareNetwork, Copy, Link } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

interface ShareButtonProps {
  post: Post;
  shareCount: number;
  onShare?: () => void;
}

export function ShareButton({ post, shareCount, onShare }: ShareButtonProps) {
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleRepost = async () => {
    if (!user) { toast.error("Sign in to share posts 🐾"); setMenuOpen(false); return; }
    if (pending) return;
    setPending(true);
    setMenuOpen(false);

    try {
      // Create a repost — new post referencing original via shared_from_id
      const content = post.content.length > 200
        ? post.content.slice(0, 197) + "…"
        : post.content;

      const { error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content,
          image_url: post.image_url,
          shared_from_id: post.shared_from_id ?? post.id,
        })
        .then((r) => r);

      if (error) throw error;
      onShare?.();
      toast("Shared to your timeline! 🐾");
    } catch {
      toast.error("Failed to share. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    toast("Link copied! 🔗");
    setMenuOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 600, damping: 20 }}
        onClick={() => setMenuOpen((o) => !o)}
        disabled={pending}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
          "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
        aria-label="Share"
      >
        <ShareNetwork size={16} weight="duotone" />
        {shareCount > 0 && <span>{shareCount}</span>}
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              className="absolute bottom-10 left-0 z-50 min-w-[160px] rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden"
            >
              <button
                onClick={handleRepost}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
              >
                <ShareNetwork size={15} weight="duotone" className="text-paw-pink" />
                Repost to timeline
              </button>
              <button
                onClick={handleCopyLink}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
              >
                <Copy size={15} weight="duotone" />
                Copy link
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
