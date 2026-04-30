"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Bell } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import type { Notification } from "@/types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<Notification["type"], string> = {
  like:     "🐾",
  reaction: "🐾",
  follow:   "😻",
  reply:    "💬",
  comment:  "💬",
  mention:  "📣",
  share:    "🔄",
};

const TYPE_LABEL: Record<Notification["type"], string> = {
  like:     "reacted to your post",
  reaction: "reacted to your post",
  follow:   "started following you",
  reply:    "replied to your comment",
  comment:  "commented on your post",
  mention:  "mentioned you",
  share:    "shared your post",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function initials(name?: string | null) {
  return name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??";
}

export function AlertsView() {
  const { user } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*, actor:profiles(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (mounted) {
        setNotifications((data as Notification[]) ?? []);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`alerts:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          if (!mounted) return;
          const { data } = await supabase
            .from("notifications")
            .select("*, actor:profiles(*)")
            .eq("id", payload.new.id)
            .single();
          if (data && mounted)
            setNotifications((prev) => [data as Notification, ...prev]);
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      mounted = false;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then((r) => r);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id).then((r) => r);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
        <Bell size={40} weight="duotone" />
        <p className="text-sm">Sign in to see your notifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Whiskers 🔔</h1>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-paw-pink px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
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

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-secondary animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 bg-secondary animate-pulse rounded" />
                <div className="h-2.5 w-20 bg-secondary animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground"
        >
          <span className="text-4xl">😴</span>
          <p className="font-semibold">All quiet on the whisker front</p>
          <p className="text-sm">Notifications will appear here when someone interacts with you.</p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={() => !n.read && markRead(n.id)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors cursor-default",
                  n.read
                    ? "border-border/40 bg-card"
                    : "border-paw-pink/30 bg-paw-pink/5 cursor-pointer hover:bg-paw-pink/8"
                )}
              >
                <div className="relative shrink-0">
                  <Link href={`/profile/${n.actor?.username ?? ""}`}>
                    <Avatar className="h-9 w-9 ring-2 ring-paw-pink/20 hover:ring-paw-pink/50 transition-all">
                      <AvatarImage src={n.actor?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
                        {initials(n.actor?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <span className="absolute -bottom-1 -right-1 text-sm leading-none">
                    {TYPE_ICON[n.type]}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <Link href={`/profile/${n.actor?.username ?? ""}`} className="font-semibold hover:underline">
                      {n.actor?.display_name ?? "Someone"}
                    </Link>{" "}
                    {TYPE_LABEL[n.type]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                </div>

                {!n.read && (
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-paw-pink" />
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
