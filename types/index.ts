export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  age: number | null;
  birthday: string | null;
  gender: string | null;
  pet_names: string[] | null;
  pet_types: string[] | null;
  is_private: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  shared_from_id: string | null;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  author?: Profile;
  shared_from?: Post | null;
  liked_by_me?: boolean;
  my_reaction?: string | null;
  pawmarked_by_me?: boolean;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  reaction_emoji: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  gif_url: string | null;
  created_at: string;
  author?: Profile;
  replies?: Comment[];
}

export interface Pawmark {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "like" | "follow" | "reply" | "mention" | "comment" | "share" | "reaction";
  post_id: string | null;
  comment_id: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  created_at: string;
  other_user?: Profile;
  last_message?: DirectMessage | null;
  unread_count?: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  status: "sent" | "delivered" | "seen";
  seen_at: string | null;
  created_at: string;
  sender?: Profile;
}

export type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

export const REACTIONS = [
  { value: "like",  emoji: "🐾", label: "Paw" },
  { value: "haha",  emoji: "😹", label: "Purrfect" },
  { value: "love",  emoji: "❤️", label: "Fur-ever" },
  { value: "wow",   emoji: "😺", label: "Hiss-teresting" },
  { value: "sad",   emoji: "😿", label: "Fur-get…" },
  { value: "angry", emoji: "😾", label: "Hiss!" },
] as const;

export type ReactionValue = (typeof REACTIONS)[number]["value"];
export type ReactionEmoji = (typeof REACTIONS)[number]["emoji"];

/** Map a DB reaction value to its display emoji */
export function reactionEmoji(value: string | null): string {
  if (!value) return "🐾";
  return REACTIONS.find((r) => r.value === value)?.emoji ?? "🐾";
}

/** Map a DB reaction value to its label */
export function reactionLabel(value: string | null): string {
  if (!value) return "Paw";
  return REACTIONS.find((r) => r.value === value)?.label ?? "Paw";
}
