"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  MagnifyingGlass,
  Bell,
  Envelope,
  BookmarkSimple,
  PlusCircle,
  User,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { useSession } from "@/hooks/useSession";

const NAV = [
  { label: "Home",    href: "/",         icon: House },
  { label: "Explore", href: "/explore",  icon: MagnifyingGlass },
  { label: "New",     href: null,        icon: PlusCircle },   // compose trigger
  { label: "Mail",    href: "/messages", icon: Envelope },
  { label: "Profile", href: "/profile",  icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/90 backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-1 safe-area-inset-bottom">
        {NAV.map(({ label, href, icon: Icon }) => {
          if (!href) {
            // Compose button
            return (
              <motion.button
                key="compose"
                whileTap={{ scale: 0.88 }}
                onClick={() => window.dispatchEvent(new CustomEvent("purrspace:open-compose"))}
                className="flex flex-col items-center gap-0.5 px-3 py-2 text-paw-pink"
              >
                <Icon size={26} weight="fill" />
                <span className="text-[10px] font-semibold">{label}</span>
              </motion.button>
            );
          }

          const isAlerts = href === "/alerts";
          const active = pathname === href || (isAlerts && pathname === "/alerts");

          if (isAlerts) {
            return (
              <Link key={href} href={href} className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 transition-colors relative",
                active ? "text-paw-pink" : "text-muted-foreground"
              )}>
                <div className="relative">
                  <Bell size={22} weight={active ? "fill" : "duotone"} />
                  {user && (
                    <span className="absolute -top-1 -right-1 scale-75">
                      <NotificationBell userId={user.id} />
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">Alerts</span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 transition-colors",
                active ? "text-paw-pink" : "text-muted-foreground"
              )}
            >
              <Icon size={22} weight={active ? "fill" : "duotone"} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}

        {/* Saved */}
        <Link
          href="/saved"
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-2 transition-colors",
            pathname === "/saved" ? "text-paw-pink" : "text-muted-foreground"
          )}
        >
          <BookmarkSimple size={22} weight={pathname === "/saved" ? "fill" : "duotone"} />
          <span className="text-[10px] font-medium">Saved</span>
        </Link>
      </div>
    </nav>
  );
}
