"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types";
import { cn } from "@/lib/utils";
import { PawPrintIcon } from "./PawPrintIcon";

const TYPE_ICON: Record<Notification["type"], string> = {
  like:             "🐾",
  reaction:         "🐾",
  comment_reaction: "🐾",
  follow:           "😻",
  follow_request:   "🐱",
  reply:            "💬",
  comment:          "💬",
  mention:          "📣",
  share:            "🔄",
};

const TYPE_LABEL: Record<Notification["type"], string> = {
  like:             "reacted to your post",
  reaction:         "reacted to your post",
  comment_reaction: "reacted to your comment",
  follow:           "started following you",
  follow_request:   "wants to follow you",
  reply:            "replied to your comment",
  comment:          "commented on your post",
  mention:          "mentioned you",
  share:            "shared your post",
};

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*, actor:profiles!actor_id(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data as Notification[]);
    };
    load();
  }, [userId]);

  // ── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (!mounted) return;
          const { data } = await supabase
            .from("notifications")
            .select("*, actor:profiles!actor_id(*)")
            .eq("id", payload.new.id)
            .single();
          if (data && mounted)
            setNotifications((prev) => [data as Notification, ...prev.slice(0, 19)]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ── Close on outside click ────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 600, damping: 20 }}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-2xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={20} weight="duotone" />

        {/* Cat-ear badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 700, damping: 18 }}
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-paw-pink px-1 text-[9px] font-bold text-white"
              style={{ clipPath: "polygon(0 20%, 50% 0%, 100% 20%, 100% 100%, 0 100%)" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="absolute right-0 top-11 z-50 w-80 rounded-3xl border border-border/60 bg-card shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <PawPrintIcon size={14} className="text-paw-pink" />
                <span className="text-sm font-semibold">Whiskers</span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-muted-foreground hover:text-paw-pink transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="text-3xl">😴</span>
                  <p className="text-sm text-muted-foreground">All quiet on the whisker front.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/50",
                      !n.read && "bg-paw-pink/5"
                    )}
                  >
                    <span className="mt-0.5 text-base">{TYPE_ICON[n.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">
                        <span className="font-semibold">
                          {n.actor?.display_name ?? "Someone"}
                        </span>{" "}
                        {TYPE_LABEL[n.type]}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-paw-pink" />
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
