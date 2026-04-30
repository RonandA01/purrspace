"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

const TRENDING = [
  { tag: "#MondayCats",   posts: "4.2k" },
  { tag: "#ZoomiesHour",  posts: "1.8k" },
  { tag: "#BreadLoafMode", posts: "9.1k" },
  { tag: "#TreatTime",    posts: "3.3k" },
  { tag: "#KneadingTherapy", posts: "2.7k" },
];

const WHO_TO_FOLLOW = [
  { name: "Nyan Overlord",  handle: "nyan_overlord" },
  { name: "Biscuit Maker",  handle: "biscuit_maker" },
  { name: "Tail Wagger",    handle: "tail_wagger" },
];

export function RightPanel() {
  return (
    <aside className="hidden xl:flex w-72 flex-col gap-4 py-6 pl-2">
      {/* Trending tags */}
      <Card className="rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <h2 className="text-sm font-semibold text-foreground">🔥 Trending Tags</h2>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1">
          {TRENDING.map(({ tag, posts }) => (
            <button
              key={tag}
              className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-secondary transition-colors"
            >
              <span className="font-medium text-paw-pink">{tag}</span>
              <span className="text-xs text-muted-foreground">{posts} posts</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Who to follow */}
      <Card className="rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <h2 className="text-sm font-semibold text-foreground">🐾 Who to Follow</h2>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {WHO_TO_FOLLOW.map(({ name, handle }) => (
            <div key={handle} className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-catnip-green-light text-catnip-green text-xs font-semibold">
                  {name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{name}</p>
                <p className="text-xs text-muted-foreground">@{handle}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="rounded-full border border-paw-pink px-3 py-0.5 text-xs font-semibold text-paw-pink hover:bg-paw-pink hover:text-white transition-colors"
              >
                Follow
              </motion.button>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="px-2 text-[11px] text-muted-foreground/60 leading-relaxed">
        PurrSpace · Made with 🐾 · Privacy · Terms
      </p>
    </aside>
  );
}
