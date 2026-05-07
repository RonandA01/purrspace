"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  House,
  MagnifyingGlass,
  Bell,
  Envelope,
  BookmarkSimple,
  User,
  PlusCircle,
  SignOut,
  GearSix,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PawPrintIcon } from "./PawPrintIcon";
import { NotificationBell } from "./NotificationBell";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

const navItems = [
  { label: "Home",      href: "/",          icon: House },
  { label: "Explore",   href: "/explore",   icon: MagnifyingGlass },
  { label: "Whispurrs", href: "/messages",  icon: Envelope },
  { label: "Pawmarks",  href: "/saved",     icon: BookmarkSimple },
  { label: "Profile",   href: "/profile",   icon: User },
  { label: "Settings",  href: "/settings",  icon: GearSix },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useSession();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials =
    profile?.display_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "??";

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-border bg-sidebar px-4 py-6 sticky top-0">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="text-paw-pink"><PawPrintIcon size={28} /></span>
        <span className="text-xl font-bold tracking-tight text-foreground">
          Purr<span className="text-paw-pink">Space</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-paw-pink"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-2xl bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3 w-full">
                <Icon
                  size={20}
                  weight="duotone"
                  className={active ? "text-paw-pink" : "text-current"}
                />
                <span>{label}</span>
              </span>
            </Link>
          );
        })}

        {/* Whiskers (notifications) — inline so it can hold live count */}
        <Link
          href="/alerts"
          className={cn(
            "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/alerts"
              ? "bg-accent text-paw-pink"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {pathname === "/alerts" && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-2xl bg-accent"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-3 w-full">
            <Bell size={20} weight="duotone" className={pathname === "/alerts" ? "text-paw-pink" : "text-current"} />
            <span>Whiskers</span>
            <span className="ml-auto">
              {user && <NotificationBell userId={user.id} />}
            </span>
          </span>
        </Link>
      </nav>

      <Separator className="my-4 bg-border" />

      {/* Compose button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.03 }}
        transition={{ type: "spring", stiffness: 600, damping: 22 }}
        onClick={() => window.dispatchEvent(new CustomEvent("purrspace:open-compose"))}
        className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-paw-pink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-paw-pink/90 transition-colors"
      >
        <PlusCircle size={18} weight="bold" />
        New Post
      </motion.button>

      {/* User footer */}
      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-2.5 w-16 rounded-full" />
          </div>
        </div>
      ) : user && profile ? (
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-secondary transition-colors">
          <Avatar className="h-9 w-9 ring-2 ring-paw-pink/30">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              {profile.display_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{profile.username}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 600, damping: 20 }}
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Sign out"
          >
            <SignOut size={16} weight="duotone" />
          </motion.button>
        </div>
      ) : (
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 rounded-2xl border border-paw-pink/40 px-4 py-2 text-sm font-semibold text-paw-pink hover:bg-paw-pink/10 transition-colors"
        >
          Sign in
        </Link>
      )}
    </aside>
  );
}
