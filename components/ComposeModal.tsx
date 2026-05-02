"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImageSquare } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

const MAX_CHARS = 280;

function initials(name?: string | null) {
  return name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??";
}

export function ComposeModal() {
  const { user, profile } = useSession();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  // Listen for open-compose event from Sidebar and BottomNav
  useEffect(() => {
    const handler = () => {
      if (!user) { toast.error("Sign in to post"); return; }
      setOpen(true);
    };
    window.addEventListener("purrspace:open-compose", handler);
    return () => window.removeEventListener("purrspace:open-compose", handler);
  }, [user]);

  // Auto-focus textarea when opened
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 80);
  }, [open]);

  const close = () => {
    setOpen(false);
    setContent("");
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handlePost = async () => {
    if (!user || !profile || !content.trim()) return;
    setPosting(true);

    let image_url: string | null = null;
    if (imageFile) {
      try {
        const { default: imageCompression } = await import("browser-image-compression");
        const compressed = await imageCompression(imageFile, { maxSizeMB: 1, maxWidthOrHeight: 1200 });
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("post-media")
          .upload(path, compressed, { upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("post-media").getPublicUrl(path);
        image_url = data.publicUrl;
      } catch {
        toast.error("Image upload failed");
        setPosting(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({ author_id: user.id, content: content.trim(), image_url })
      .select("*, author:profiles(*)")
      .single();

    if (error) {
      toast.error("Failed to post");
    } else {
      // Notify Feed to prepend immediately
      window.dispatchEvent(new CustomEvent("purrspace:new-post", { detail: data }));
      toast("Posted! 🐾");
      close();
    }

    setPosting(false);
  };

  const remaining = MAX_CHARS - content.length;
  const canPost = content.trim().length > 0 && remaining >= 0 && !posting;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="compose-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
          onMouseUp={(e) => {
            if (e.target === e.currentTarget && mouseDownOnBackdrop.current) close();
            mouseDownOnBackdrop.current = false;
          }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-border/60 bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <h2 className="font-bold text-sm">New Post</h2>
              <button onClick={close} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Compose area */}
            <div className="flex gap-3 px-5 pt-4 pb-2">
              <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
                  {initials(profile?.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{profile?.display_name}</p>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind, furball? 🐾"
                  maxLength={MAX_CHARS}
                  rows={3}
                  className="w-full mt-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="relative mx-5 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-48 object-cover rounded-2xl"
                />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-paw-pink hover:bg-paw-pink/10 transition-colors"
                  title="Add image"
                >
                  <ImageSquare size={18} weight="duotone" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs tabular-nums ${remaining <= 20 ? "text-destructive" : "text-muted-foreground"}`}>
                  {remaining}
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={!canPost}
                  onClick={handlePost}
                  className="rounded-2xl bg-paw-pink px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-paw-pink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {posting ? "Posting…" : "Post"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
