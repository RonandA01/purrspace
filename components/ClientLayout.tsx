"use client";

import { SessionProvider } from "./SessionProvider";
import { ComposeModal } from "./ComposeModal";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TopNav />
      {children}
      <ComposeModal />
      <BottomNav />
    </SessionProvider>
  );
}
