"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, UserPlus, Check, X } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import type { Notification, FollowRequest } from "@/types";
import { cn } from "@/lib/utils";

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

function notificationHref(n: Notification): string {
  if (n.type === "follow" || n.type === "follow_request") return `/profile/${n.actor?.username ?? ""}`;
  if (
    (n.type === "comment" || n.type === "reply" || n.type === "comment_reaction") &&
    n.post_id && n.comment_id
  ) return `/post/${n.post_id}?comment=${n.comment_id}`;
  if (n.post_id) return `/post/${n.post_id}`;
  return "#";
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

type FilterId = "all" | "reaction" | "comment" | "follow" | "mention";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all",      label: "All" },
  { id: "reaction", label: "Paws" },
  { id: "comment",  label: "Purrlies" },
  { id: "follow",   label: "Follows" },
  { id: "mention",  label: "Mentions" },
];

function matchesFilter(n: Notification, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "reaction") return n.type === "reaction" || n.type === "comment_reaction" || n.type === "like";
  if (filter === "comment")  return n.type === "comment" || n.type === "reply";
  if (filter === "follow")   return n.type === "follow";
  if (filter === "mention")  return n.type === "mention";
  return true;
}

// ── Follow Requests section ───────────────────────────────────────────────────

function FollowRequestsSection({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("follow_requests")
      .select("*, requester:profiles!requester_id(*)")
      .eq("target_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (mounted) {
          setRequests((data ?? []) as FollowRequest[]);
          setLoading(false);
        }
      });

    // Realtime: new follow requests
    const channel = supabase
      .channel(`follow-requests:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follow_requests", filter: `target_id=eq.${userId}` },
        async (payload) => {
          if (!mounted) return;
          const { data } = await supabase
            .from("follow_requests")
            .select("*, requester:profiles!requester_id(*)")
            .eq("id", payload.new.id)
            .single();
          if (data && mounted) setRequests((prev) => [data as FollowRequest, ...prev]);
        }
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [userId]);

  const accept = async (req: FollowRequest) => {
    // 1. Mark accepted
    const { error: updErr } = await supabase
      .from("follow_requests")
      .update({ status: "accepted" })
      .eq("id", req.id);
    if (updErr) { toast.error("Failed to accept request"); return; }

    // 2. Insert follow
    await supabase
      .from("follows")
      .insert({ follower_id: req.requester_id, following_id: userId });

    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    toast(`${req.requester?.display_name ?? "User"} is now following you 🐾`);
  };

  const decline = async (req: FollowRequest) => {
    const { error } = await supabase
      .from("follow_requests")
      .update({ status: "declined" })
      .eq("id", req.id);
    if (error) { toast.error("Failed to decline"); return; }
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    toast("Follow request declined.");
  };

  if (loading || requests.length === 0) return null;

  return (
    <section className="rounded-2xl border border-paw-pink/30 bg-paw-pink/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-paw-pink/20">
        <UserPlus size={16} weight="duotone" className="text-paw-pink" />
        <h2 className="text-sm font-bold text-foreground">Follow Requests</h2>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-paw-pink px-1.5 text-[10px] font-bold text-white">
          {requests.length}
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {requests.map((req) => (
          <div key={req.id} className="flex items-center gap-3 px-4 py-3">
            <Link href={`/profile/${req.requester?.username ?? ""}`}>
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-paw-pink/20 hover:ring-paw-pink/50 transition-all">
                <AvatarImage src={req.requester?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
                  {initials(req.requester?.display_name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">
                {req.requester?.display_name ?? "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">@{req.requester?.username}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => accept(req)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-paw-pink text-white hover:bg-paw-pink/90 transition-colors"
                title="Accept"
              >
                <Check size={15} weight="bold" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => decline(req)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                title="Decline"
              >
                <X size={15} weight="bold" />
              </motion.button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Main AlertsView ───────────────────────────────────────────────────────────

export function AlertsView() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) { setLoading(false); return; }
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*, actor:profiles!actor_id(*)")
        .eq("user_id", user.id)
        // Exclude follow_request notifications from main stream (shown in dedicated section)
        .neq("type", "follow_request")
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
          if (!mounted || payload.new.type === "follow_request") return;
          const { data } = await supabase
            .from("notifications")
            .select("*, actor:profiles!actor_id(*)")
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
  }, [user, sessionLoading]);

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
  const filtered = notifications.filter((n) => matchesFilter(n, filter));

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
          <h1 className="text-lg font-bold">Meowtifications 🔔</h1>
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

      {/* Follow Requests section — private account owners only */}
      <FollowRequestsSection userId={user.id} />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-semibold transition-colors border",
              filter === f.id
                ? "bg-paw-pink text-white border-paw-pink"
                : "bg-card text-muted-foreground border-border/60 hover:border-paw-pink/40 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
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
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground"
        >
          <span className="text-4xl">😴</span>
          <p className="font-semibold">
            {filter === "all"
              ? "All quiet on the whisker front"
              : `No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} yet`}
          </p>
          <p className="text-sm">
            {filter === "all"
              ? "Notifications will appear here when someone interacts with you."
              : "Try a different filter or check back later."}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  const href = notificationHref(n);
                  if (href !== "#") router.push(href);
                }}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors cursor-pointer",
                  n.read
                    ? "border-border/40 bg-card hover:bg-secondary/50"
                    : "border-paw-pink/30 bg-paw-pink/5 hover:bg-paw-pink/10"
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
