"use client";

import { ComposeModal } from "./ComposeModal";
import { BottomNav } from "./BottomNav";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ComposeModal />
      <BottomNav />
    </>
  );
}
