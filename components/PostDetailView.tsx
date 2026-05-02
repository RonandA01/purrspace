"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { CatPost } from "./CatPost";
import { PostSkeleton } from "./PostSkeleton";
import type { Post } from "@/types";

interface Props {
  postId: string;
  highlightCommentId?: string;
}

export function PostDetailView({ postId, highlightCommentId }: Props) {
  const { user } = useSession();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("posts")
        .select(
          "*, author:profiles(*), shared_from:posts!shared_from_id(*, author:profiles(*))"
        )
        .eq("id", postId)
        .single();

      if (!mounted) return;
      if (!data) { setLoading(false); return; }

      let myReaction: string | null = null;
      let likedByMe = false;
      let pawmarkedByMe = false;

      if (user) {
        const [likeRes, pawmarkRes] = await Promise.all([
          supabase
            .from("likes")
            .select("reaction_emoji")
            .eq("post_id", postId)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("pawmarks")
            .select("id")
            .eq("post_id", postId)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        if (likeRes.data) {
          likedByMe = true;
          myReaction = likeRes.data.reaction_emoji;
        }
        pawmarkedByMe = Boolean(pawmarkRes.data);
      }

      if (mounted) {
        setPost({
          ...data,
          liked_by_me: likedByMe,
          my_reaction: myReaction,
          pawmarked_by_me: pawmarkedByMe,
        });
        setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [postId, user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <PostSkeleton />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="text-5xl">😿</span>
        <p className="text-sm text-muted-foreground">Post not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <CatPost
        post={post}
        alwaysShowComments
        highlightCommentId={highlightCommentId}
      />
    </div>
  );
}
