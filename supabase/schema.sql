-- ============================================================
-- PurrSpace — Full Schema v2 (Feature Update)
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
  cover_url     text,
  bio           text,
  age           integer,
  pet_names     text[],
  pet_types     text[],
  is_private    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Add missing columns if already exists (idempotent migration)
alter table public.profiles add column if not exists cover_url    text;
alter table public.profiles add column if not exists age          integer;
alter table public.profiles add column if not exists pet_names    text[];
alter table public.profiles add column if not exists pet_types    text[];
alter table public.profiles add column if not exists is_private   boolean not null default false;
alter table public.profiles add column if not exists birthday     date;
alter table public.profiles add column if not exists gender       text;

-- ── 2. POSTS ────────────────────────────────────────────────
create table if not exists public.posts (
  id              uuid primary key default uuid_generate_v4(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  content         text not null check (char_length(content) <= 280),
  image_url       text,
  like_count      integer not null default 0,
  comment_count   integer not null default 0,
  share_count     integer not null default 0,
  shared_from_id  uuid references public.posts(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.posts add column if not exists comment_count  integer not null default 0;
alter table public.posts add column if not exists share_count    integer not null default 0;
alter table public.posts add column if not exists shared_from_id uuid references public.posts(id) on delete set null;

-- ── 3. LIKES (Reactions) ────────────────────────────────────
-- reaction_emoji stores reaction value: like | haha | love | wow | sad | angry
create table if not exists public.likes (
  id             uuid primary key default uuid_generate_v4(),
  post_id        uuid not null references public.posts(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  reaction_emoji text not null default 'like',
  created_at     timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.likes add column if not exists reaction_emoji text not null default 'like';

-- Migrate existing emoji-character values to string values
update public.likes set reaction_emoji = 'like'  where reaction_emoji = '🐾';
update public.likes set reaction_emoji = 'haha'  where reaction_emoji = '😹';
update public.likes set reaction_emoji = 'love'  where reaction_emoji = '❤️';
update public.likes set reaction_emoji = 'wow'   where reaction_emoji = '😺';
update public.likes set reaction_emoji = 'sad'   where reaction_emoji = '😿';
update public.likes set reaction_emoji = 'angry' where reaction_emoji = '😾';

-- ── 4. COMMENTS ─────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  content    text not null check (char_length(content) <= 280),
  created_at timestamptz not null default now()
);

-- ── 5. PAWMARKS (Bookmarks) ──────────────────────────────────
create table if not exists public.pawmarks (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- ── 6. FOLLOWS ──────────────────────────────────────────────
create table if not exists public.follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ── 7. DIRECT MESSAGES ──────────────────────────────────────
create table if not exists public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  participant_1   uuid not null references public.profiles(id) on delete cascade,
  participant_2   uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  -- ensure canonical ordering so (A,B) and (B,A) are the same row
  check (participant_1 < participant_2)
);

create table if not exists public.direct_messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  content         text not null check (char_length(content) <= 1000),
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ── 8. NOTIFICATIONS ────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete set null,
  type       text not null,
  post_id    uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists comment_id uuid references public.comments(id) on delete cascade;

-- Drop old type constraint and recreate with all types
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'follow', 'reply', 'mention', 'comment', 'share', 'reaction'));

-- ── 9. TRIGGER: auto-create profile on signup ───────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_birthday date;
  v_age      integer;
  v_gender   text;
begin
  -- Parse birthday string from metadata (ISO date: YYYY-MM-DD)
  begin
    v_birthday := (new.raw_user_meta_data->>'birthday')::date;
  exception when others then
    v_birthday := null;
  end;

  -- Compute age from birthday
  if v_birthday is not null then
    v_age := date_part('year', age(v_birthday))::integer;
  else
    v_age := null;
  end if;

  v_gender := new.raw_user_meta_data->>'gender';

  insert into public.profiles (id, username, display_name, avatar_url, birthday, age, gender)
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
    new.raw_user_meta_data->>'avatar_url',
    v_birthday,
    v_age,
    v_gender
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 10. TRIGGER: keep like_count in sync ────────────────────
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

-- ── 11. TRIGGER: keep comment_count in sync ─────────────────
create or replace function public.update_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_comment_change on public.comments;
create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute procedure public.update_comment_count();

-- ── 12. TRIGGER: keep share_count in sync ───────────────────
create or replace function public.update_share_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' and NEW.shared_from_id is not null then
    update public.posts set share_count = share_count + 1 where id = NEW.shared_from_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_share_insert on public.posts;
create trigger on_share_insert
  after insert on public.posts
  for each row execute procedure public.update_share_count();

-- ── 13. TRIGGER: create reaction notification ────────────────
create or replace function public.handle_like_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = NEW.post_id;
  if v_author is not null and v_author <> NEW.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (v_author, NEW.user_id, 'reaction', NEW.post_id);
  end if;
  return null;
end;
$$;

drop trigger if exists on_new_like on public.likes;
create trigger on_new_like
  after insert on public.likes
  for each row execute procedure public.handle_like_notification();

-- ── 14. TRIGGER: create comment notification ─────────────────
create or replace function public.handle_comment_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author        uuid;
  v_parent_author uuid;
begin
  -- Notify post author of new comment
  select author_id into v_author from public.posts where id = NEW.post_id;
  if v_author is not null and v_author <> NEW.author_id then
    insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
    values (v_author, NEW.author_id, 'comment', NEW.post_id, NEW.id);
  end if;
  -- Notify parent comment author if this is a reply
  if NEW.parent_id is not null then
    select author_id into v_parent_author from public.comments where id = NEW.parent_id;
    if v_parent_author is not null
       and v_parent_author <> NEW.author_id
       and v_parent_author <> coalesce(v_author, '00000000-0000-0000-0000-000000000000'::uuid) then
      insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
      values (v_parent_author, NEW.author_id, 'reply', NEW.post_id, NEW.id);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists on_new_comment on public.comments;
create trigger on_new_comment
  after insert on public.comments
  for each row execute procedure public.handle_comment_notification();

-- ── 15. TRIGGER: create follow notification ──────────────────
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

-- ── 16. TRIGGER: create share notification ───────────────────
create or replace function public.handle_share_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_original_author uuid;
begin
  if NEW.shared_from_id is not null then
    select author_id into v_original_author from public.posts where id = NEW.shared_from_id;
    if v_original_author is not null and v_original_author <> NEW.author_id then
      insert into public.notifications (user_id, actor_id, type, post_id)
      values (v_original_author, NEW.author_id, 'share', NEW.shared_from_id);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists on_new_share on public.posts;
create trigger on_new_share
  after insert on public.posts
  for each row execute procedure public.handle_share_notification();

-- ── 17. TRIGGER: update conversation last_message_at ─────────
create or replace function public.update_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
  set last_message_at = NEW.created_at
  where id = NEW.conversation_id;
  return null;
end;
$$;

drop trigger if exists on_new_direct_message on public.direct_messages;
create trigger on_new_direct_message
  after insert on public.direct_messages
  for each row execute procedure public.update_conversation_last_message();

-- ── 18. ROW LEVEL SECURITY ──────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.likes         enable row level security;
alter table public.comments      enable row level security;
alter table public.pawmarks      enable row level security;
alter table public.follows       enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.direct_messages enable row level security;

-- profiles
drop policy if exists "Public profiles are visible to everyone" on public.profiles;
create policy "Public profiles are visible to everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- posts: private account posts only visible to followers + self
drop policy if exists "Posts are public" on public.posts;
drop policy if exists "Posts are visible based on privacy" on public.posts;
create policy "Posts are visible based on privacy"
  on public.posts for select
  using (
    -- public account OR own post OR follower
    not exists (
      select 1 from public.profiles p where p.id = author_id and p.is_private = true
    )
    or auth.uid() = author_id
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = author_id
    )
  );

drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

drop policy if exists "Authors can update their posts" on public.posts;
create policy "Authors can update their posts"
  on public.posts for update
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "Authors can delete their posts" on public.posts;
create policy "Authors can delete their posts"
  on public.posts for delete
  using (auth.uid() = author_id);

-- likes
drop policy if exists "Likes are public" on public.likes;
create policy "Likes are public"
  on public.likes for select using (true);

drop policy if exists "Users can like" on public.likes;
drop policy if exists "Users can react" on public.likes;
create policy "Users can react"
  on public.likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike" on public.likes;
drop policy if exists "Users can unreact" on public.likes;
create policy "Users can unreact"
  on public.likes for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can update own reaction" on public.likes;
create policy "Users can update own reaction"
  on public.likes for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- comments
drop policy if exists "Comments are public" on public.comments;
create policy "Comments are public"
  on public.comments for select using (true);

drop policy if exists "Authenticated users can comment" on public.comments;
create policy "Authenticated users can comment"
  on public.comments for insert
  with check (auth.uid() = author_id);

drop policy if exists "Authors can delete own comments" on public.comments;
create policy "Authors can delete own comments"
  on public.comments for delete
  using (auth.uid() = author_id);

-- pawmarks
drop policy if exists "Users see own pawmarks" on public.pawmarks;
create policy "Users see own pawmarks"
  on public.pawmarks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can pawmark" on public.pawmarks;
create policy "Users can pawmark"
  on public.pawmarks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove pawmark" on public.pawmarks;
create policy "Users can remove pawmark"
  on public.pawmarks for delete
  using (auth.uid() = user_id);

-- follows
drop policy if exists "Follows are public" on public.follows;
create policy "Follows are public"
  on public.follows for select using (true);

drop policy if exists "Users can follow" on public.follows;
create policy "Users can follow"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- notifications
drop policy if exists "Users see own notifications" on public.notifications;
create policy "Users see own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- conversations
drop policy if exists "Participants can see conversations" on public.conversations;
create policy "Participants can see conversations"
  on public.conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);

drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
  on public.conversations for update
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

-- direct_messages
drop policy if exists "Participants can see messages" on public.direct_messages;
create policy "Participants can see messages"
  on public.direct_messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

drop policy if exists "Participants can send messages" on public.direct_messages;
create policy "Participants can send messages"
  on public.direct_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

drop policy if exists "Sender can delete own messages" on public.direct_messages;
create policy "Sender can delete own messages"
  on public.direct_messages for delete
  using (auth.uid() = sender_id);

-- ── 19. STORAGE BUCKETS ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media', 'post-media', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Public read on post-media" on storage.objects;
create policy "Public read on post-media"
  on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "Auth users can upload to post-media" on storage.objects;
create policy "Auth users can upload to post-media"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

drop policy if exists "Users can delete own uploads" on storage.objects;
create policy "Users can delete own uploads"
  on storage.objects for delete
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Public read on avatars" on storage.objects;
create policy "Public read on avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Auth users can upload avatars" on storage.objects;
create policy "Auth users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── 20. REALTIME ─────────────────────────────────────────────
-- Add each table only if not already a member of the publication
do $$
declare
  pub_name text := 'supabase_realtime';
  tbl      record;
begin
  for tbl in
    select unnest(array[
      'public.posts',
      'public.likes',
      'public.comments',
      'public.notifications',
      'public.direct_messages',
      'public.conversations'
    ]) as relname
  loop
    if not exists (
      select 1
      from   pg_publication_tables
      where  pubname   = pub_name
        and  schemaname = split_part(tbl.relname, '.', 1)
        and  tablename  = split_part(tbl.relname, '.', 2)
    ) then
      execute format('alter publication %I add table %s', pub_name, tbl.relname);
    end if;
  end loop;
end;
$$;

-- ── 21. INDEXES for performance ──────────────────────────────
create index if not exists idx_posts_author_id   on public.posts(author_id);
create index if not exists idx_posts_created_at  on public.posts(created_at desc);
create index if not exists idx_comments_post_id  on public.comments(post_id);
create index if not exists idx_comments_parent   on public.comments(parent_id);
create index if not exists idx_likes_post_id     on public.likes(post_id);
create index if not exists idx_likes_user_id     on public.likes(user_id);
create index if not exists idx_pawmarks_user_id  on public.pawmarks(user_id);
create index if not exists idx_notif_user_id     on public.notifications(user_id, read, created_at desc);
create index if not exists idx_follows_follower  on public.follows(follower_id);
create index if not exists idx_follows_following on public.follows(following_id);
create index if not exists idx_dm_conversation   on public.direct_messages(conversation_id, created_at desc);
create index if not exists idx_conversations_p1  on public.conversations(participant_1);
create index if not exists idx_conversations_p2  on public.conversations(participant_2);
