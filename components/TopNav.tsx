"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PawPrintIcon } from "./PawPrintIcon";
import { useSession } from "@/hooks/useSession";

function initials(name?: string | null) {
  return name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??";
}

export function TopNav() {
  const { profile } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 backdrop-blur-md px-4 md:hidden">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <PawPrintIcon size={22} className="text-paw-pink" />
        <span className="text-base font-bold tracking-tight">PurrSpace</span>
      </Link>

      {/* Profile avatar */}
      <Link href="/profile">
        <Avatar className="h-8 w-8 ring-2 ring-paw-pink/30 hover:ring-paw-pink/60 transition-all">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
            {initials(profile?.display_name)}
          </AvatarFallback>
        </Avatar>
      </Link>
    </header>
  );
}
