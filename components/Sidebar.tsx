"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PawPrintIcon } from "./PawPrintIcon";

const navItems = [
  { label: "Home",       href: "/",          icon: House,          badge: undefined },
  { label: "Explore",    href: "/explore",   icon: MagnifyingGlass, badge: undefined },
  { label: "Purr-Mail",  href: "/messages",  icon: Envelope,       badge: 3 },
  { label: "Whiskers",   href: "/alerts",    icon: Bell,           badge: 7 },
  { label: "Saved",      href: "/saved",     icon: BookmarkSimple, badge: undefined },
  { label: "Profile",    href: "/profile",   icon: User,           badge: undefined },
];

export function Sidebar() {
  const pathname = usePathname();
  const [composing, setComposing] = useState(false);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar px-4 py-6">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="text-paw-pink">
          <PawPrintIcon size={28} />
        </span>
        <span className="text-xl font-bold tracking-tight text-foreground">
          Purr<span className="text-paw-pink">Space</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ label, href, icon: Icon, badge }) => {
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
                {badge !== undefined && (
                  <Badge className="ml-auto bg-paw-pink text-white text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                    {badge}
                  </Badge>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4 bg-border" />

      {/* Compose button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        onClick={() => setComposing(true)}
        className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-paw-pink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-paw-pink/90 transition-colors"
      >
        <PlusCircle size={18} weight="bold" />
        New Post
      </motion.button>

      {/* User footer */}
      <div className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-secondary transition-colors cursor-pointer">
        <Avatar className="h-9 w-9 ring-2 ring-paw-pink/30">
          <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
            ME
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">You</p>
          <p className="text-xs text-muted-foreground truncate">@catperson</p>
        </div>
        <button
          className="text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Sign out"
        >
          <SignOut size={16} weight="duotone" />
        </button>
      </div>
    </aside>
  );
}
