"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  PencilSimple,
  Lock,
  LockOpen,
  X,
  Check,
  ChatTeardropText,
  Archive,
  ArrowCounterClockwise,
  Trash,
  CaretDown,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CatPost } from "./CatPost";
import { PostSkeleton } from "./PostSkeleton";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import type { Post, Profile } from "@/types";
import imageCompression from "browser-image-compression";

interface ProfileViewProps {
  username?: string; // undefined = own profile
}

function initials(name?: string | null) {
  return (
    name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "??"
  );
}

export function ProfileView({ username }: ProfileViewProps) {
  const { user, profile: myProfile, loading: sessionLoading, refreshProfile } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [archivedPosts, setArchivedPosts] = useState<Post[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editPetNames, setEditPetNames] = useState("");
  const [editPetTypes, setEditPetTypes] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  // Only true when the loaded profile actually belongs to the signed-in user
  const isOwnProfile = Boolean(user && profile && profile.id === user.id);

  // Load profile
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loadProfile = async () => {
      let profileData: Profile | null = null;

      if (username) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .single();
        profileData = data;
      } else if (user) {
        profileData = myProfile;
      }

      if (!mounted) return;
      setProfile(profileData);
      setLoading(false);

      if (profileData) {
        // Load follow counts
        const [followersRes, followingRes, isFollowingRes] = await Promise.all([
          supabase.from("follows").select("id", { count: "exact" }).eq("following_id", profileData.id),
          supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", profileData.id),
          user
            ? supabase
                .from("follows")
                .select("id")
                .eq("follower_id", user.id)
                .eq("following_id", profileData.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (mounted) {
          setFollowersCount(followersRes.count ?? 0);
          setFollowingCount(followingRes.count ?? 0);
          setIsFollowing(Boolean(isFollowingRes.data));
        }
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, [username, user, myProfile]);

  // Load posts
  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    setPostsLoading(true);

    const isOwn = Boolean(user && profile.id === user.id);

    supabase
      .from("posts")
      .select("*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*))")
      .eq("author_id", profile.id)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(async ({ data }) => {
        if (!mounted || !data) return;

        let likedIds = new Set<string>();
        let reactionMap = new Map<string, string>();
        let pawmarkedIds = new Set<string>();

        if (user && data.length > 0) {
          const postIds = data.map((p) => p.id);
          const [likeRes, pawmarkRes] = await Promise.all([
            supabase.from("likes").select("post_id, reaction_emoji").eq("user_id", user.id).in("post_id", postIds),
            supabase.from("pawmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
          ]);
          for (const l of likeRes.data ?? []) { likedIds.add(l.post_id); reactionMap.set(l.post_id, l.reaction_emoji); }
          for (const p of pawmarkRes.data ?? []) { pawmarkedIds.add(p.post_id); }
        }

        setPosts(
          data.map((p) => ({
            ...p,
            liked_by_me: likedIds.has(p.id),
            my_reaction: reactionMap.get(p.id) ?? null,
            pawmarked_by_me: pawmarkedIds.has(p.id),
          }))
        );
        setPostsLoading(false);
      });

    // Load archived posts — own profile only
    if (isOwn) {
      supabase
        .from("posts")
        .select("*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*))")
        .eq("author_id", profile.id)
        .eq("archived", true)
        .order("archived_at", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (!mounted || !data) return;
          setArchivedPosts(data.map((p) => ({ ...p, liked_by_me: false, my_reaction: null, pawmarked_by_me: false })));
        });
    }

    return () => { mounted = false; };
  }, [profile, user]);

  const openEdit = () => {
    if (!profile || !user || profile.id !== user.id) return;
    setEditName(profile.display_name);
    setEditUsername(profile.username);
    setEditBio(profile.bio ?? "");
    setEditAge(profile.age?.toString() ?? "");
    setEditPetNames((profile.pet_names ?? []).join(", "));
    setEditPetTypes((profile.pet_types ?? []).join(", "));
    setEditIsPrivate(profile.is_private);
    setIsEditing(true);
  };

  const saveProfile = async () => {
    // Guard: never allow saving another user's profile
    if (!user || !profile || profile.id !== user.id) {
      toast.error("You can only edit your own profile.");
      setSaving(false);
      return;
    }
    setSaving(true);

    const updates: Partial<Profile> = {
      display_name: editName.trim() || profile.display_name,
      username: editUsername.trim() || profile.username,
      bio: editBio.trim() || null,
      age: editAge ? parseInt(editAge, 10) : null,
      pet_names: editPetNames
        ? editPetNames.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      pet_types: editPetTypes
        ? editPetTypes.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      is_private: editIsPrivate,
    };

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .then((r) => r);

      if (error) {
        // RLS violation returns a PostgrestError — show the message
        toast.error("Failed to save: " + (error.message ?? "Unknown error"));
      } else {
        setProfile((p) => (p ? { ...p, ...updates } : p));
        await refreshProfile(); // keep Sidebar / ComposeBox in sync
        toast("Profile updated! 🐾");
        setIsEditing(false);
      }
    } catch (err) {
      // Network failure, expired session, etc.
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg);
    } finally {
      // Always unblock the button — no more infinite "Saving…"
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 400 });
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatar_url = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url }).eq("id", user.id).then((r) => r);
      setProfile((p) => (p ? { ...p, avatar_url } : p));
      toast("Profile picture updated! 🐾");
    } catch {
      toast.error("Failed to upload image.");
    }
  };

  const uploadCover = async (file: File) => {
    if (!user) return;
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200 });
      const ext = file.name.split(".").pop();
      const path = `${user.id}/cover.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const cover_url = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from("profiles").update({ cover_url }).eq("id", user.id).then((r) => r);
      setProfile((p) => (p ? { ...p, cover_url } : p));
      toast("Cover photo updated! 🐾");
    } catch {
      toast.error("Failed to upload cover.");
    }
  };

  const toggleFollow = async () => {
    if (!user || !profile) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id).then((r) => r);
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id }).then((r) => r);
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
    }
  };

  const handleRestorePost = async (postId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("posts")
      .update({ archived: false, archived_at: null })
      .eq("id", postId);
    if (!error) {
      const restored = archivedPosts.find((p) => p.id === postId);
      setArchivedPosts((prev) => prev.filter((p) => p.id !== postId));
      if (restored) {
        setPosts((prev) => [{ ...restored, archived: false, archived_at: null }, ...prev]);
      }
      toast("Post restored 🐾");
    } else {
      toast.error("Failed to restore post.");
    }
  };

  const handlePermDeletePost = async (postId: string) => {
    if (!user) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) {
      setArchivedPosts((prev) => prev.filter((p) => p.id !== postId));
      toast("Post permanently deleted 🗑️");
    } else {
      toast.error("Failed to delete post.");
    }
  };

  if (loading || (!username && sessionLoading)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="text-5xl">😿</span>
        <p className="text-sm text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  // Private account guard
  const showPrivateGuard = profile.is_private && !isOwnProfile && !isFollowing;

  return (
    <div className="space-y-4">
      {/* Cover */}
      <div className="relative h-36 rounded-3xl overflow-hidden bg-paw-pink-light">
        {profile.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
        )}
        {isOwnProfile && (
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-white text-xs hover:bg-black/60 transition-colors"
          >
            <Camera size={12} /> Cover
          </button>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }}
        />
      </div>

      {/* Avatar + actions */}
      <div className="flex items-end justify-between px-1 -mt-10">
        <div className="relative">
          <Avatar className="h-20 w-20 ring-4 ring-card">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xl font-bold">
              {initials(profile.display_name)}
            </AvatarFallback>
          </Avatar>
          {isOwnProfile && (
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-paw-pink text-white shadow hover:bg-paw-pink/90 transition-colors"
            >
              <Camera size={13} />
            </button>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
          />
        </div>

        <div className="flex gap-2 pb-1">
          {isOwnProfile ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={openEdit}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <PencilSimple size={14} /> Edit profile
            </motion.button>
          ) : user ? (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/messages?user_id=${profile.id}`)}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-secondary transition-colors"
                aria-label="Message"
              >
                <ChatTeardropText size={14} />
                Message
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleFollow}
                className={
                  isFollowing
                    ? "rounded-full border border-border px-4 py-1.5 text-sm font-semibold hover:bg-secondary transition-colors"
                    : "rounded-full bg-paw-pink px-4 py-1.5 text-sm font-semibold text-white hover:bg-paw-pink/90 transition-colors"
                }
              >
                {isFollowing ? "Following" : "Follow"}
              </motion.button>
            </>
          ) : null}
        </div>
      </div>

      {/* Bio */}
      <div className="px-1 space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold leading-tight">{profile.display_name}</h1>
          {profile.is_private && <Lock size={14} className="text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {profile.bio && <p className="text-sm leading-relaxed">{profile.bio}</p>}
        {(profile.pet_names?.length ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground">
            🐱 {profile.pet_names?.join(", ")}
            {(profile.pet_types?.length ?? 0) > 0 && ` · ${profile.pet_types?.join(", ")}`}
          </p>
        )}
        {profile.age && (
          <p className="text-xs text-muted-foreground">Age {profile.age}</p>
        )}
        <div className="flex gap-4 pt-1">
          <span className="text-sm">
            <strong>{followersCount}</strong>{" "}
            <span className="text-muted-foreground">followers</span>
          </span>
          <span className="text-sm">
            <strong>{followingCount}</strong>{" "}
            <span className="text-muted-foreground">following</span>
          </span>
          <span className="text-sm">
            <strong>{posts.length}</strong>{" "}
            <span className="text-muted-foreground">posts</span>
          </span>
        </div>
      </div>

      {/* Private guard */}
      {showPrivateGuard ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center rounded-3xl border border-border/60">
          <span className="text-4xl">🔒</span>
          <p className="font-semibold">Ooopsie, no peeking.</p>
          <p className="text-sm text-muted-foreground">This account is private. Follow to see their posts.</p>
        </div>
      ) : postsLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <PostSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <span className="text-3xl">😺</span>
          <p className="text-sm">No posts yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <CatPost key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Archived posts — own profile only */}
      {isOwnProfile && archivedPosts.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Archive size={15} weight="duotone" />
            Archived posts ({archivedPosts.length})
            <motion.span
              animate={{ rotate: showArchived ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="ml-auto"
            >
              <CaretDown size={14} />
            </motion.span>
          </button>

          <AnimatePresence>
            {showArchived && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="space-y-3 overflow-hidden"
              >
                {archivedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-3xl border border-border/60 bg-card/70 px-5 py-4 space-y-2 opacity-75"
                  >
                    {/* Mini author row */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Archived {post.archived_at ? new Date(post.archived_at).toLocaleDateString() : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          onClick={() => handleRestorePost(post.id)}
                          className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-secondary transition-colors"
                        >
                          <ArrowCounterClockwise size={11} weight="bold" />
                          Restore
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          onClick={() => handlePermDeletePost(post.id)}
                          className="flex items-center gap-1 rounded-full border border-red-200 dark:border-red-800/60 px-2.5 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <Trash size={11} weight="duotone" />
                          Delete
                        </motion.button>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap line-clamp-3">
                      {post.content}
                    </p>
                    {post.image_url && (
                      <div className="rounded-xl overflow-hidden border border-border/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.image_url} alt="" className="w-full object-cover max-h-40" loading="lazy" />
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
            onMouseUp={(e) => {
              if (e.target === e.currentTarget && mouseDownOnBackdrop.current) setIsEditing(false);
              mouseDownOnBackdrop.current = false;
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base">Edit Profile</h2>
                <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Display name", value: editName, onChange: setEditName, placeholder: "Your name" },
                  { label: "Username", value: editUsername, onChange: setEditUsername, placeholder: "username" },
                  { label: "Bio", value: editBio, onChange: setEditBio, placeholder: "Tell us about yourself…" },
                  { label: "Age", value: editAge, onChange: setEditAge, placeholder: "e.g. 24", type: "number" },
                  { label: "Pet name(s)", value: editPetNames, onChange: setEditPetNames, placeholder: "Whiskers, Luna, …" },
                  { label: "Pet type(s)", value: editPetTypes, onChange: setEditPetTypes, placeholder: "Cat, Dog, …" },
                ].map(({ label, value, onChange, placeholder, type }) => (
                  <div key={label} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <input
                      type={type ?? "text"}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-paw-pink/40 transition"
                    />
                  </div>
                ))}

                {/* Privacy toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {editIsPrivate ? <Lock size={15} className="text-paw-pink" /> : <LockOpen size={15} className="text-muted-foreground" />}
                    <span className="text-sm font-medium">
                      {editIsPrivate ? "Private account" : "Public account"}
                    </span>
                  </div>
                  <button
                    onClick={() => setEditIsPrivate((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${editIsPrivate ? "bg-paw-pink" : "bg-border"}`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${editIsPrivate ? "translate-x-5" : ""}`}
                    />
                  </button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={saveProfile}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-paw-pink py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : <><Check size={15} /> Save changes</>}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
