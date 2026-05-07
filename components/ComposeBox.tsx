"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, X, Globe, Lock, CaretDown } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PawPrintIcon } from "./PawPrintIcon";
import { supabase } from "@/lib/supabase";
import { uploadPostImage } from "@/lib/uploadImage";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import type { Post } from "@/types";

const MAX_CHARS = 280;
const TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please try again.")), ms)
    ),
  ]);
}

export function ComposeBox() {
  const { user, profile } = useSession();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "followers_only">("public");
  const [showVisMenu, setShowVisMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load last-used visibility from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("ps-last-visibility") as "public" | "followers_only" | null;
    if (stored) setVisibility(stored);
  }, []);

  const handleVisibilityChange = (v: "public" | "followers_only") => {
    setVisibility(v);
    localStorage.setItem("ps-last-visibility", v);
    setShowVisMenu(false);
  };

  const remaining = MAX_CHARS - content.length;
  const overLimit = remaining < 0;
  const canPost = content.trim().length > 0 && !overLimit && !submitting;

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!canPost || !user) return;
    setSubmitting(true);

    // Optimistic: immediately push post into feed via custom event
    const tempId = `opt-${Date.now()}`;
    const optimisticPost: Post = {
      id: tempId,
      author_id: user.id,
      content: content.trim(),
      image_url: imagePreview,
      like_count: 0,
      comment_count: 0,
      share_count: 0,
      shared_from_id: null,
      archived: false,
      archived_at: null,
      visibility,
      created_at: new Date().toISOString(),
      author: profile ?? undefined,
      liked_by_me: false,
      my_reaction: null,
      pawmarked_by_me: false,
    };
    window.dispatchEvent(new CustomEvent("purrspace:new-post", { detail: optimisticPost }));

    // Clear form immediately so the user can type the next post
    const capturedContent = content.trim();
    const capturedImageFile = imageFile;
    const capturedVisibility = visibility;
    setContent("");
    removeImage();

    try {
      let image_url: string | null = null;

      if (capturedImageFile) {
        image_url = await withTimeout(
          uploadPostImage(capturedImageFile, user.id),
          TIMEOUT_MS
        );
      }

      const { error: insertError, data } = await withTimeout(
        supabase
          .from("posts")
          .insert({ author_id: user.id, content: capturedContent, image_url, visibility: capturedVisibility })
          .select("*, author:profiles(*)")
          .single()
          .then((r) => r),
        TIMEOUT_MS
      );

      if (insertError) {
        throw new Error(
          (insertError as { message?: string }).message ?? "Failed to post. Please try again."
        );
      }

      // Replace the optimistic post with the real one (Feed deduplicates by id)
      if (data) {
        const realPost: Post = {
          ...data,
          liked_by_me: false,
          my_reaction: null,
          pawmarked_by_me: false,
        };
        // Dispatch real post; Feed will add it and skip the temp id when realtime fires
        window.dispatchEvent(new CustomEvent("purrspace:new-post", { detail: realPost }));
        // Remove the optimistic temp entry
        window.dispatchEvent(
          new CustomEvent("purrspace:remove-post", { detail: { id: tempId } })
        );
      }

      toast("Posted! 🐾", { description: "Your post is live." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(msg);
      // Remove optimistic entry on failure
      window.dispatchEvent(
        new CustomEvent("purrspace:remove-post", { detail: { id: tempId } })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const initials =
    profile?.display_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "ME";

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 ring-2 ring-paw-pink/30 mt-0.5 shrink-0">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            user
              ? "What's on your whiskers today? 🐾"
              : "Sign in to post something purrfect…"
          }
          disabled={!user || submitting}
          rows={3}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed disabled:opacity-50"
        />
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative rounded-2xl overflow-hidden border border-border/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Preview" className="w-full max-h-60 object-cover" />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
              aria-label="Remove image"
            >
              <X size={14} weight="bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visibility selector */}
      <div className="relative">
        <button
          onClick={() => setShowVisMenu((v) => !v)}
          disabled={!user || submitting}
          className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-paw-pink/40 transition-colors disabled:opacity-40"
        >
          {visibility === "public"
            ? <><Globe size={12} className="text-paw-pink" /> 🌍 Public</>
            : <><Lock size={12} className="text-paw-pink" /> 🐾 Followers Only</>}
          <CaretDown size={10} className={`transition-transform ${showVisMenu ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {showVisMenu && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              className="absolute left-0 top-full mt-1 z-20 rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden min-w-[170px]"
            >
              {[
                { value: "public" as const, icon: "🌍", label: "Public", desc: "Anyone can see" },
                { value: "followers_only" as const, icon: "🐾", label: "Followers Only", desc: "Only followers" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleVisibilityChange(opt.value)}
                  className={`flex items-start gap-2 w-full px-3 py-2.5 text-left hover:bg-secondary transition-colors ${visibility === opt.value ? "text-paw-pink" : "text-foreground"}`}
                >
                  <span className="mt-0.5 text-sm">{opt.icon}</span>
                  <div>
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 600, damping: 20 }}
            onClick={() => fileRef.current?.click()}
            disabled={!user || submitting}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-paw-pink transition-colors disabled:opacity-40"
            aria-label="Attach image"
          >
            <ImageIcon size={18} weight="duotone" />
          </motion.button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />

          <span
            className={`text-xs ${overLimit ? "text-destructive font-semibold" : "text-muted-foreground"}`}
          >
            {remaining}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.04 }}
          transition={{ type: "spring", stiffness: 600, damping: 20 }}
          onClick={handleSubmit}
          disabled={!canPost}
          className="flex items-center gap-1.5 rounded-full bg-paw-pink px-4 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paw-pink/90 transition-colors"
        >
          {submitting ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="block"
            >
              <PawPrintIcon size={14} />
            </motion.span>
          ) : (
            <PawPrintIcon size={14} />
          )}
          {submitting ? "Posting…" : "Post"}
        </motion.button>
      </div>
    </div>
  );
}
