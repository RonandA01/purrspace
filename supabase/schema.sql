-- ============================================================
-- PurrSpace — Full Schema, RLS, Triggers, Storage
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 0. Extensions ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. PROFILES ─────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null default '',
  avatar_url    text,
  bio           text,
  created_at    timestamptz not null default now()
);

-- ── 2. POSTS ────────────────────────────────────────────────
create table if not exists public.posts (
  id          uuid primary key default uuid_generate_v4(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  content     text not null check (char_length(content) <= 280),
  image_url   text,
  like_count  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── 3. LIKES ────────────────────────────────────────────────
create table if not exists public.likes (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- ── 4. FOLLOWS ──────────────────────────────────────────────
create table if not exists public.follows (
  id          uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ── 5. NOTIFICATIONS ────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  type        text not null check (type in ('like', 'follow', 'reply', 'mention')),
  post_id     uuid references public.posts(id) on delete cascade,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── 6. TRIGGER: auto-create profile on signup ───────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 7. TRIGGER: keep like_count in sync ─────────────────────
create or replace function public.update_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_like_change on public.likes;
create trigger on_like_change
  after insert or delete on public.likes
  for each row execute procedure public.update_like_count();

-- ── 8. TRIGGER: create like notification ────────────────────
create or replace function public.handle_like_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = NEW.post_id;
  if v_author is not null and v_author <> NEW.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (v_author, NEW.user_id, 'like', NEW.post_id);
  end if;
  return null;
end;
$$;

drop trigger if exists on_new_like on public.likes;
create trigger on_new_like
  after insert on public.likes
  for each row execute procedure public.handle_like_notification();

-- ── 9. TRIGGER: create follow notification ───────────────────
create or replace function public.handle_follow_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (NEW.following_id, NEW.follower_id, 'follow');
  return null;
end;
$$;

drop trigger if exists on_new_follow on public.follows;
create trigger on_new_follow
  after insert on public.follows
  for each row execute procedure public.handle_follow_notification();

-- ── 10. ROW LEVEL SECURITY ──────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.likes         enable row level security;
alter table public.follows       enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "Public profiles are visible to everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- posts
create policy "Posts are public"
  on public.posts for select using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Authors can update their posts"
  on public.posts for update
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "Authors can delete their posts"
  on public.posts for delete
  using (auth.uid() = author_id);

-- likes
create policy "Likes are public"
  on public.likes for select using (true);

create policy "Users can like"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.likes for delete
  using (auth.uid() = user_id);

-- follows
create policy "Follows are public"
  on public.follows for select using (true);

create policy "Users can follow"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- notifications
create policy "Users see own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 11. STORAGE BUCKET ──────────────────────────────────────
-- Creates the post-media bucket (public read, authenticated write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Public read on post-media"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "Auth users can upload to post-media"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

create policy "Users can delete own uploads"
  on storage.objects for delete
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── 12. REALTIME ─────────────────────────────────────────────
-- Enable realtime for feed and notifications
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.notifications;
