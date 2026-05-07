"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookmarkSimple, Archive, ArrowCounterClockwise, Trash } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CatPost } from "./CatPost";
import { PostSkeleton } from "./PostSkeleton";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

function initials(name?: string | null) {
  return name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??";
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Saved posts ───────────────────────────────────────────────────────────────

function SavedTab() {
  const { user } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from("pawmarks")
      .select("post_id, posts:post_id(*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*)))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }

        const rawPosts = data.map((r: { posts: unknown }) => r.posts).filter(Boolean) as Post[];
        const postIds = rawPosts.map((p) => p.id);
        const reactionMap = new Map<string, string>();
        if (postIds.length > 0) {
          const { data: likes } = await supabase
            .from("likes").select("post_id, reaction_emoji")
            .eq("user_id", user.id).in("post_id", postIds);
          for (const l of likes ?? []) reactionMap.set(l.post_id, l.reaction_emoji);
        }

        setPosts(rawPosts.map((p) => ({
          ...p,
          liked_by_me: reactionMap.has(p.id),
          my_reaction: reactionMap.get(p.id) ?? null,
          pawmarked_by_me: true,
        })));
        setLoading(false);
      });
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
        <BookmarkSimple size={40} weight="duotone" />
        <p className="text-sm">Sign in to see your Pawmarks.</p>
      </div>
    );
  }

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <PostSkeleton key={i} />)}</div>;

  if (posts.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <span className="text-4xl">🐾</span>
        <p className="font-semibold">Nothing saved yet</p>
        <p className="text-sm">Tap the bookmark icon on any post to save it here.</p>
      </motion.div>
    );
  }

  return <div className="space-y-4">{posts.map((post) => <CatPost key={post.id} post={post} />)}</div>;
}

// ── Archived posts ────────────────────────────────────────────────────────────

function ArchivedTab() {
  const { user } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from("posts")
      .select("*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*))")
      .eq("author_id", user.id)
      .eq("archived", true)
      .order("archived_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setPosts((data ?? []).map((p) => ({
          ...p, liked_by_me: false, my_reaction: null, pawmarked_by_me: false,
        })));
        setLoading(false);
      });
  }, [user]);

  const handleRestore = async (postId: string) => {
    const { error } = await supabase.from("posts")
      .update({ archived: false, archived_at: null }).eq("id", postId);
    if (error) { toast.error("Failed to restore post."); return; }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast("Post restored to your profile 🐾");
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) { toast.error("Failed to delete post."); return; }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast("Post permanently deleted 🗑️");
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
        <Archive size={40} weight="duotone" />
        <p className="text-sm">Sign in to manage your archived posts.</p>
      </div>
    );
  }

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <PostSkeleton key={i} />)}</div>;

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <span className="text-4xl">📦</span>
        <p className="font-semibold">No archived posts</p>
        <p className="text-sm">Posts you archive will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <motion.div key={post.id}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 pt-4 pb-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={post.author?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
                {initials(post.author?.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">{post.author?.display_name ?? "You"}</p>
              <p className="text-xs text-muted-foreground">Archived {timeAgo(post.archived_at)}</p>
            </div>
          </div>
          <div className="px-5 pb-3 space-y-2">
            <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap line-clamp-4">{post.content}</p>
            {post.image_url && (
              <div className="rounded-2xl overflow-hidden border border-border/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image_url} alt="" className="w-full object-cover max-h-48" loading="lazy" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-5 py-3 border-t border-border/40 bg-secondary/30">
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => handleRestore(post.id)}
              className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold hover:bg-secondary transition-colors">
              <ArrowCounterClockwise size={13} weight="bold" /> Restore
            </motion.button>
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => handleDelete(post.id)}
              className="flex items-center gap-1.5 rounded-full border border-red-200 dark:border-red-800/50 px-3.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <Trash size={13} weight="duotone" /> Delete permanently
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main SavedView ────────────────────────────────────────────────────────────

type Tab = "saved" | "archived";

const TABS: { id: Tab; label: string; icon: typeof Archive }[] = [
  { id: "saved",    label: "Pawmarks", icon: BookmarkSimple },
  { id: "archived", label: "Archived", icon: Archive },
];

export function SavedView() {
  const [tab, setTab] = useState<Tab>("saved");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold">Pawmarks</h1>
        <span className="text-muted-foreground text-sm">· your saved posts</span>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-2xl border border-border/60 bg-secondary/40 p-1 gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="relative flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-colors">
            {tab === id && (
              <motion.span layoutId="saved-tab-pill"
                className="absolute inset-0 rounded-xl bg-card shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 34 }} />
            )}
            <span className={cn("relative flex items-center gap-1.5", tab === id ? "text-foreground" : "text-muted-foreground")}>
              <Icon size={15} weight={tab === id ? "fill" : "duotone"}
                className={tab === id ? "text-paw-pink" : "text-current"} />
              {label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
          {tab === "saved"    && <SavedTab />}
          {tab === "archived" && <ArchivedTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
