"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlass, PaperPlaneTilt, Plus, Envelope, ArrowLeft } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import type { Conversation, DirectMessage, Profile } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function initials(name?: string | null) {
  return (
    name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??"
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function MessagesView() {
  const { user, profile } = useSession();
  const searchParams = useSearchParams();
  const autoUserId = searchParams.get("user_id");
  const autoStartedRef = useRef(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [convLoading, setConvLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const loadConvs = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (!mounted || !data) return;

      // Fetch other user profiles
      const enriched: Conversation[] = await Promise.all(
        data.map(async (conv) => {
          const otherId =
            conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
          const { data: otherProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", otherId)
            .single();
          const { data: lastMsg } = await supabase
            .from("direct_messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          const { count } = await supabase
            .from("direct_messages")
            .select("id", { count: "exact" })
            .eq("conversation_id", conv.id)
            .eq("read", false)
            .neq("sender_id", user.id);
          return {
            ...conv,
            other_user: otherProfile ?? undefined,
            last_message: lastMsg ?? null,
            unread_count: count ?? 0,
          };
        })
      );

      if (mounted) {
        setConversations(enriched);
        setConvLoading(false);
      }
    };

    loadConvs();
    return () => { mounted = false; };
  }, [user]);

  // Auto-open conversation from ?user_id= URL param (e.g. from Profile "Message" button)
  useEffect(() => {
    if (!user || !autoUserId || autoStartedRef.current) return;
    autoStartedRef.current = true;

    const autoOpen = async () => {
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", autoUserId)
        .single();
      if (otherProfile) {
        await startConversation(otherProfile as Profile);
      }
    };
    autoOpen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, autoUserId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConv || !user) return;
    let mounted = true;
    setMsgLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*, sender:profiles(*)")
        .eq("conversation_id", activeConv.id)
        .order("created_at", { ascending: true });

      if (!mounted) return;
      setMessages((data as DirectMessage[]) ?? []);
      setMsgLoading(false);

      // Mark received messages as seen (read + status update)
      supabase
        .from("direct_messages")
        .update({ read: true, status: "seen", seen_at: new Date().toISOString() })
        .eq("conversation_id", activeConv.id)
        .neq("sender_id", user.id)
        .neq("status", "seen")
        .then(() => {});
    };
    load();

    // Realtime for this conversation — INSERT + UPDATE (for status changes)
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`dm:${activeConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        async (payload) => {
          if (!mounted) return;
          const { data } = await supabase
            .from("direct_messages")
            .select("*, sender:profiles(*)")
            .eq("id", payload.new.id)
            .single();
          if (data && mounted) {
            setMessages((prev) => {
              // Deduplicate: real ID already in state from sendMessage's .select()
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data as DirectMessage];
            });
            if (data.sender_id !== user.id) {
              // Recipient is in this conversation → mark seen immediately
              supabase
                .from("direct_messages")
                .update({ read: true, status: "seen", seen_at: new Date().toISOString() })
                .eq("id", data.id)
                .then(() => {});
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          if (!mounted) return;
          // Update status/seen_at so the sender sees delivery ticks in real-time
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id
                ? { ...m, status: payload.new.status as DirectMessage["status"], seen_at: payload.new.seen_at, read: payload.new.read }
                : m
            )
          );
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      mounted = false;
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [activeConv, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search users for new chat
  useEffect(() => {
    if (!searchUser.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${searchUser}%,display_name.ilike.%${searchUser}%`)
        .neq("id", user?.id ?? "")
        .limit(6);
      setSearchResults(data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [searchUser, user]);

  const startConversation = async (other: Profile) => {
    if (!user) return;
    setNewChatOpen(false);
    setSearchUser("");
    setSearchResults([]);

    // Canonical order: smaller UUID first
    const [p1, p2] = [user.id, other.id].sort();

    // Upsert conversation
    const { data, error } = await supabase
      .from("conversations")
      .upsert({ participant_1: p1, participant_2: p2 }, { onConflict: "participant_1,participant_2" })
      .select()
      .single()
      .then((r) => r);

    if (error) { toast.error("Could not start conversation"); return; }

    const conv: Conversation = {
      ...data,
      other_user: other,
      last_message: null,
      unread_count: 0,
    };
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      return exists ? prev : [conv, ...prev];
    });
    setActiveConv(conv);
  };

  const sendMessage = async () => {
    if (!user || !activeConv || !msgText.trim() || sending) return;
    setSending(true);
    const content = msgText.trim();
    setMsgText("");

    // Optimistic insert with temp ID
    const opt: DirectMessage = {
      id: `opt-${Date.now()}`,
      conversation_id: activeConv.id,
      sender_id: user.id,
      content,
      read: false,
      status: "sent",
      seen_at: null,
      created_at: new Date().toISOString(),
      sender: profile ?? undefined,
    };
    setMessages((prev) => [...prev, opt]);

    try {
      // Fetch the real row back so we can swap the temp ID → real UUID.
      // This means the Realtime INSERT event will find the real ID already
      // in state and deduplicate correctly — no double render.
      const { data: inserted, error } = await supabase
        .from("direct_messages")
        .insert({ conversation_id: activeConv.id, sender_id: user.id, content })
        .select("*, sender:profiles(*)")
        .single();
      if (error) throw error;
      setMessages((prev) =>
        prev.map((m) => (m.id === opt.id ? (inserted as DirectMessage) : m))
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== opt.id));
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Envelope size={40} weight="duotone" />
        <p className="text-sm">Sign in to access Purr-Mail</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Conversation list — full-width on mobile, fixed sidebar on desktop.
          Hidden on mobile when a conversation is open. */}
      <div className={cn(
        "border-r border-border flex-col shrink-0",
        "w-full md:w-72",
        activeConv ? "hidden md:flex" : "flex"
      )}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
          <h2 className="font-bold text-base">Purr-Mail ✉️</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setNewChatOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-paw-pink text-white hover:bg-paw-pink/90 transition-colors"
          >
            <Plus size={14} weight="bold" />
          </motion.button>
        </div>

        {/* New chat search */}
        <AnimatePresence>
          {newChatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border/50 overflow-hidden"
            >
              <div className="p-3 space-y-2">
                <div className="relative">
                  <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Search users…"
                    className="w-full rounded-xl border border-border bg-secondary py-1.5 pl-7 pr-3 text-xs outline-none focus:ring-1 focus:ring-paw-pink/40"
                  />
                </div>
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-secondary text-left"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-paw-pink-light text-paw-pink text-[10px]">{initials(u.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{u.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <div className="h-9 w-9 rounded-full bg-secondary animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 bg-secondary animate-pulse rounded" />
                    <div className="h-2 w-16 bg-secondary animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
              <span className="text-3xl">😺</span>
              <p className="text-xs text-muted-foreground">No conversations yet. Start one with the + button!</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors",
                  activeConv?.id === conv.id && "bg-secondary"
                )}
              >
                <Avatar className="h-9 w-9 shrink-0 ring-2 ring-paw-pink/20">
                  <AvatarImage src={conv.other_user?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
                    {initials(conv.other_user?.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate">{conv.other_user?.display_name ?? "Unknown"}</p>
                    {conv.last_message && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {timeAgo(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.last_message?.content ?? "No messages yet"}
                  </p>
                </div>
                {(conv.unread_count ?? 0) > 0 && (
                  <span className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full bg-paw-pink text-[10px] font-bold text-white px-1">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message thread — hidden on mobile until a conversation is selected */}
      <div className={cn(
        "flex-col overflow-hidden flex-1",
        activeConv ? "flex" : "hidden md:flex"
      )}>
        {activeConv ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/50 px-5 py-3 shrink-0">
              {/* Back button — mobile only */}
              <button
                onClick={() => setActiveConv(null)}
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Back to conversations"
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar className="h-8 w-8 ring-2 ring-paw-pink/20">
                <AvatarImage src={activeConv.other_user?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
                  {initials(activeConv.other_user?.display_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{activeConv.other_user?.display_name}</p>
                <p className="text-xs text-muted-foreground">@{activeConv.other_user?.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {msgLoading ? (
                <div className="flex justify-center py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="h-5 w-5 rounded-full border-2 border-paw-pink border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                  <span className="text-3xl">🐱</span>
                  <p className="text-sm">Say hello! 👋</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className={cn("flex gap-2", isMe && "flex-row-reverse")}
                      >
                        {!isMe && (
                          <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                            <AvatarImage src={msg.sender?.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-paw-pink-light text-paw-pink text-[10px] font-bold">
                              {initials(msg.sender?.display_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("max-w-[70%] space-y-0.5", isMe && "items-end flex flex-col")}>
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2 text-sm leading-relaxed",
                              isMe
                                ? "rounded-tr-sm bg-paw-pink text-white"
                                : "rounded-tl-sm bg-secondary text-foreground"
                            )}
                          >
                            {msg.content}
                          </div>
                          <div className={cn("flex items-center gap-1 px-1", isMe && "justify-end")}>
                            <span className="text-[10px] text-muted-foreground">
                              {timeAgo(msg.created_at)}
                            </span>
                            {isMe && (
                              <span className={cn(
                                "text-[10px] font-bold leading-none",
                                msg.status === "seen"
                                  ? "text-paw-pink"
                                  : "text-muted-foreground/60"
                              )}>
                                {msg.status === "sent"      && "✓"}
                                {msg.status === "delivered" && "✓✓"}
                                {msg.status === "seen"      && "✓✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/50 px-5 py-3 shrink-0">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2">
                <input
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type a message…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={sendMessage}
                  disabled={!msgText.trim() || sending}
                  className="text-paw-pink disabled:opacity-40 transition-opacity"
                >
                  <PaperPlaneTilt size={18} weight="fill" />
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Envelope size={40} weight="duotone" className="text-paw-pink/40" />
            <p className="font-semibold">Select a conversation</p>
            <p className="text-sm">Or start a new one with the + button</p>
          </div>
        )}
      </div>
    </div>
  );
}
