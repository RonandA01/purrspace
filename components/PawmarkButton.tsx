"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookmarkSimple } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PawmarkButtonProps {
  postId: string;
  pawmarked: boolean;
  onToggle?: (isPawmarked: boolean) => void;
}

export function PawmarkButton({ postId, pawmarked, onToggle }: PawmarkButtonProps) {
  const { user } = useSession();
  const [active, setActive] = useState(pawmarked);
  const [pending, setPending] = useState(false);

  useEffect(() => { setActive(pawmarked); }, [pawmarked]);

  const toggle = async () => {
    if (!user) { toast.error("Sign in to save posts 🐾"); return; }
    if (pending) return;

    const wasActive = active;
    setActive(!wasActive);
    onToggle?.(!wasActive);
    setPending(true);

    try {
      if (wasActive) {
        const { error } = await supabase
          .from("pawmarks")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .then((r) => r);
        if (error) throw error;
        toast("Removed from Pawmarks", { icon: "🐾" });
      } else {
        const { error } = await supabase
          .from("pawmarks")
          .insert({ post_id: postId, user_id: user.id })
          .then((r) => r);
        if (error) throw error;
        toast("Saved to Pawmarks! 🐾");
      }
    } catch {
      setActive(wasActive);
      onToggle?.(wasActive);
      toast.error("Something went wrong");
    } finally {
      setPending(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 600, damping: 20 }}
      onClick={toggle}
      disabled={pending}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
        active
          ? "text-paw-pink"
          : "text-muted-foreground hover:bg-secondary hover:text-paw-pink"
      )}
      aria-label={active ? "Remove from Pawmarks" : "Save to Pawmarks"}
    >
      <BookmarkSimple
        size={16}
        weight={active ? "fill" : "duotone"}
        className={active ? "text-paw-pink" : "text-current"}
      />
    </motion.button>
  );
}
