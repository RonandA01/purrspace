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

export type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};
