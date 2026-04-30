import type { Post } from "@/types";

export const MOCK_POSTS: Post[] = [
  {
    id: "1",
    author_id: "u1",
    content:
      "Just adopted the fluffiest orange tabby 🧡 He spent the first hour knocking things off the shelf one by one, maintaining direct eye contact the whole time. I think we're going to get along perfectly.",
    image_url: null,
    like_count: 42,
    created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    liked_by_me: false,
    author: {
      id: "u1",
      username: "mochi_mum",
      display_name: "Mochi's Mum",
      avatar_url: null,
      bio: null,
      created_at: "2024-01-01",
    },
  },
  {
    id: "2",
    author_id: "u2",
    content:
      "PSA: if your cat stares at a wall at 3 AM, they're not seeing ghosts. They're planning something far worse.",
    image_url: null,
    like_count: 128,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    liked_by_me: true,
    author: {
      id: "u2",
      username: "nyan_overlord",
      display_name: "Nyan Overlord",
      avatar_url: null,
      bio: null,
      created_at: "2024-02-14",
    },
  },
  {
    id: "3",
    author_id: "u3",
    content:
      "Hot take: cats don't sleep 16 hours a day out of laziness. They're gathering energy for the 2 AM zoomies that will absolutely destroy your sleep schedule.",
    image_url: null,
    like_count: 77,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    liked_by_me: false,
    author: {
      id: "u3",
      username: "biscuit_maker",
      display_name: "Biscuit Maker",
      avatar_url: null,
      bio: null,
      created_at: "2023-11-20",
    },
  },
  {
    id: "4",
    author_id: "u4",
    content:
      "My cat figured out how to open the treat drawer. I'd be mad but honestly I'm impressed. We respect the hustle in this household. 🐾",
    image_url: null,
    like_count: 214,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    liked_by_me: false,
    author: {
      id: "u4",
      username: "purrfect_chaos",
      display_name: "Purrfect Chaos",
      avatar_url: null,
      bio: null,
      created_at: "2024-03-05",
    },
  },
];
