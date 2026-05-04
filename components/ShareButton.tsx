"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShareNetwork,
  Copy,
  PaperPlaneTilt,
  X,
  ArrowsCounterClockwise,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

const MAX_CHARS = 280;

function initials(name?: string | null) {
  return name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??";
}

interface ShareButtonProps {
  post: Post;
  shareCount: number;
  onShare?: () => void;
}

export function ShareButton({ post, shareCount, onShare }: ShareButtonProps) {
  const { user, profile } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The original post being shared (follow the chain so we never nest a repost)
  const originalPost = post.shared_from ?? post;

  const openModal = () => {
    setMenuOpen(false);
    setCaption("");
    setModalOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCaption("");
  };

  const handleRepost = async () => {
    if (!user || !caption.trim() || pending) return;
    setPending(true);
    try {
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        content: caption.trim(),
        shared_from_id: originalPost.id,
      });
      if (error) throw error;
      onShare?.();
      toast("Shared to your timeline! 🐾");
      closeModal();
    } catch {
      toast.error("Failed to share. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`).catch(() => {});
    toast("Link copied! 🔗");
    setMenuOpen(false);
  };

  const remaining = MAX_CHARS - caption.length;

  return (
    <>
      {/* Share button + small dropdown */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 600, damping: 20 }}
          onClick={() => setMenuOpen((o) => !o)}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Share"
        >
          <ShareNetwork size={16} weight="duotone" />
          {shareCount > 0 && <span>{shareCount}</span>}
        </motion.button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ type: "spring", stiffness: 600, damping: 28 }}
                className="absolute bottom-10 left-0 z-50 min-w-[160px] rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden"
              >
                <button
                  onClick={() => {
                    if (!user) { toast.error("Sign in to share posts 🐾"); setMenuOpen(false); return; }
                    openModal();
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
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Full share modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Modal card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 24 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-lg rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ArrowsCounterClockwise size={16} weight="bold" className="text-paw-pink" />
                  Share post
                </div>
                <button
                  onClick={closeModal}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Composer area */}
              <div className="px-5 pt-4 pb-3 space-y-3">
                {/* Sharer identity */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-2 ring-paw-pink/30 shrink-0">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
                      {initials(profile?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{profile?.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                  </div>
                </div>

                {/* Caption input */}
                <textarea
                  ref={textareaRef}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRepost();
                  }}
                  placeholder="Say something about this post… 🐾"
                  rows={3}
                  maxLength={MAX_CHARS}
                  className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 leading-relaxed"
                />
              </div>

              {/* Original post preview */}
              <div className="mx-5 mb-4 rounded-2xl border border-border/60 bg-secondary/40 overflow-hidden">
                {/* Original author */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={originalPost.author?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-paw-pink-light text-paw-pink text-[9px] font-bold">
                      {initials(originalPost.author?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold truncate">
                    {originalPost.author?.display_name ?? "Unknown"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    @{originalPost.author?.username}
                  </span>
                </div>

                {/* Original content */}
                <p className="px-4 pb-3 text-xs leading-relaxed text-foreground/80 line-clamp-4 whitespace-pre-wrap">
                  {originalPost.content}
                </p>

                {/* Original image */}
                {originalPost.image_url && (
                  <div className="border-t border-border/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={originalPost.image_url}
                      alt="Original post"
                      className="w-full object-cover max-h-40"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-secondary/20">
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    remaining < 20 ? "text-red-500 font-semibold" : "text-muted-foreground"
                  )}
                >
                  {remaining}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={closeModal}
                    className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRepost}
                    disabled={!caption.trim() || pending || remaining < 0}
                    className="flex items-center gap-1.5 rounded-full bg-paw-pink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40 transition-opacity hover:bg-paw-pink/90"
                  >
                    <PaperPlaneTilt size={14} weight="fill" />
                    {pending ? "Sharing…" : "Share"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
