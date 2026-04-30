"use client";

import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";

interface ComingSoonProps {
  title: string;
  emoji: string;
  description: string;
}

export function ComingSoon({ title, emoji, description }: ComingSoonProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex flex-1 justify-center overflow-y-auto">
        <div className="w-full max-w-xl px-4 py-6">
          <div className="flex items-center gap-2 mb-8">
            <h1 className="text-lg font-bold">{title}</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="flex flex-col items-center justify-center gap-5 py-24 text-center rounded-3xl border border-border/60 bg-card"
          >
            <span className="text-6xl">{emoji}</span>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-foreground/80">
                Coming soon…
              </p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {description}
              </p>
            </div>

            {/* Decorative paw dots */}
            <div className="flex gap-2 mt-2">
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay }}
                  className="h-2 w-2 rounded-full bg-paw-pink"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <RightPanel />
    </div>
  );
}
