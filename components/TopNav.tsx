"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PawPrintIcon } from "./PawPrintIcon";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User, Gear, SignOut } from "@phosphor-icons/react";

function initials(name?: string | null) {
  return name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ?? "??";
}

export function TopNav() {
  const { profile } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click / tap
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    // Hard redirect so the router cache is fully cleared and all
    // in-memory session state is wiped along with the page.
    window.location.href = "/login";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 backdrop-blur-md px-4 md:hidden">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <PawPrintIcon size={22} className="text-paw-pink" />
        <span className="text-base font-bold tracking-tight">PurrSpace</span>
      </Link>

      {/* Avatar → dropdown */}
      <div className="relative" ref={dropRef}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpen((o) => !o)}
          className="rounded-full focus:outline-none"
          aria-label="Account menu"
          aria-expanded={open}
        >
          <Avatar className="h-8 w-8 ring-2 ring-paw-pink/30 transition-all data-[open=true]:ring-paw-pink/70">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-paw-pink-light text-paw-pink text-xs font-bold">
              {initials(profile?.display_name)}
            </AvatarFallback>
          </Avatar>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              className="absolute right-0 top-10 z-50 min-w-[192px] rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden"
            >
              {/* User info header */}
              <div className="px-4 py-3 border-b border-border/40">
                <p className="text-sm font-semibold leading-tight truncate">
                  {profile?.display_name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{profile?.username ?? "—"}
                </p>
              </div>

              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                >
                  <User size={15} weight="duotone" className="text-paw-pink shrink-0" />
                  Profile
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                >
                  <Gear size={15} weight="duotone" className="text-muted-foreground shrink-0" />
                  Settings
                </Link>

                <div className="h-px bg-border/40 my-1" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <SignOut size={15} weight="duotone" className="shrink-0" />
                  Log out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
