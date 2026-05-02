"use client";

import { SessionProvider } from "./SessionProvider";
import { ComposeModal } from "./ComposeModal";
import { BottomNav } from "./BottomNav";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <ComposeModal />
      <BottomNav />
    </SessionProvider>
  );
}
