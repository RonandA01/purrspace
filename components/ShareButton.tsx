"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShareNetwork, Copy, PaperPlaneTilt, X } from "@phosphor-icons/react";
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
  const [captionMode, setCaptionMode] = useState(false);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openCaptionMode = () => {
    setCaptionMode(true);
    setCaption("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const closeAll = () => {
    setMenuOpen(false);
    setCaptionMode(false);
    setCaption("");
  };

  const handleRepost = async () => {
    if (!user) { toast.error("Sign in to share posts 🐾"); closeAll(); return; }
    if (!caption.trim() || pending) return;
    setPending(true);

    try {
      const { error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content: caption.trim(),
          shared_from_id: post.shared_from_id ?? post.id,
        })
        .then((r) => r);

      if (error) throw error;
      onShare?.();
      toast("Shared to your timeline! 🐾");
      closeAll();
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
    closeAll();
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 600, damping: 20 }}
        onClick={() => {
          if (!captionMode) setMenuOpen((o) => !o);
        }}
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
        {(menuOpen || captionMode) && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={closeAll}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              className="absolute bottom-10 left-0 z-50 rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden"
              style={{ minWidth: captionMode ? "280px" : "160px" }}
            >
              {captionMode ? (
                /* ── Caption input panel ── */
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">Add a caption</span>
                    <button
                      onClick={closeAll}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Original post mini-preview */}
                  <div className="rounded-xl border border-border/50 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground line-clamp-2">
                    <span className="font-semibold text-foreground/70">
                      {post.author?.display_name}:
                    </span>{" "}
                    {post.content}
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleRepost();
                      }
                    }}
                    placeholder="Say something about this post… 🐾"
                    rows={3}
                    maxLength={280}
                    className="w-full resize-none rounded-xl bg-secondary px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/60 leading-relaxed"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{caption.length}/280</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleRepost}
                      disabled={!caption.trim() || pending}
                      className="flex items-center gap-1.5 rounded-full bg-paw-pink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 transition-opacity hover:bg-paw-pink/90"
                    >
                      <PaperPlaneTilt size={12} weight="fill" />
                      {pending ? "Sharing…" : "Share"}
                    </motion.button>
                  </div>
                </div>
              ) : (
                /* ── Initial menu ── */
                <>
                  <button
                    onClick={() => {
                      if (!user) { toast.error("Sign in to share posts 🐾"); return; }
                      openCaptionMode();
                    }}
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
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
