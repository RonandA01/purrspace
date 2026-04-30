"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PawPrintIcon } from "./PawPrintIcon";

export function ComposeBox() {
  const [value, setValue] = useState("");
  const MAX = 280;
  const remaining = MAX - value.length;
  const overLimit = remaining < 0;

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 ring-2 ring-paw-pink/30 mt-0.5">
          <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
            ME
          </AvatarFallback>
        </Avatar>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="What's on your whiskers today? 🐾"
          rows={3}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed"
        />
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <p className={`text-xs ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {remaining} characters left
        </p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          disabled={value.trim().length === 0 || overLimit}
          className="flex items-center gap-1.5 rounded-full bg-paw-pink px-4 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paw-pink/90 transition-colors"
        >
          <PawPrintIcon size={14} />
          Post
        </motion.button>
      </div>
    </div>
  );
}
