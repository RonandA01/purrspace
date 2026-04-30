export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  like_count: number;
  created_at: string;
  author?: Profile;
  liked_by_me?: boolean;
}

export interface Like {
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
  type: "like" | "follow" | "reply" | "mention";
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile;
}

export type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};
