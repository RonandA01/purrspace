"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  MagnifyingGlass,
  Bell,
  Envelope,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { PlusCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// 5-item nav — New is dead-center (index 2)
const NAV = [
  { label: "Home",    href: "/",         icon: House },
  { label: "Explore", href: "/explore",  icon: MagnifyingGlass },
  { label: "New",     href: null,        icon: PlusCircle },  // compose trigger
  { label: "Whiskers", href: "/alerts",  icon: Bell },
  { label: "Mail",    href: "/messages", icon: Envelope },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useSession();
  const [unread, setUnread] = useState(0);

  // Live unread notification count
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let mounted = true;

    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (mounted) setUnread(count ?? 0);
    };
    load();

    const channel = supabase
      .channel(`bottomnav-notifs:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { if (mounted) setUnread((c) => c + 1); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { if (mounted) load(); }
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [user]);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/90 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-1">
        {NAV.map(({ label, href, icon: Icon }) => {
          if (!href) {
            // Centered compose button — larger + paw-pink
            return (
              <motion.button
                key="compose"
                whileTap={{ scale: 0.88 }}
                onClick={() => window.dispatchEvent(new CustomEvent("purrspace:open-compose"))}
                className="flex flex-col items-center gap-0.5 px-3 py-1 text-paw-pink"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-paw-pink text-white shadow-md">
                  <Icon size={22} weight="bold" />
                </div>
              </motion.button>
            );
          }

          const isAlerts = href === "/alerts";
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-2 transition-colors",
                active ? "text-paw-pink" : "text-muted-foreground"
              )}
              onClick={() => { if (isAlerts && unread > 0) setUnread(0); }}
            >
              <div className="relative">
                <Icon size={22} weight={active ? "fill" : "duotone"} />
                {isAlerts && unread > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-paw-pink px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
