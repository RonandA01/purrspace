"use client";

import { usePathname } from "next/navigation";
import { SessionProvider, useSession } from "./SessionProvider";
import { ComposeModal } from "./ComposeModal";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

/** Routes where nav chrome and body offsets should never appear */
const AUTH_PATHS = ["/login", "/auth"];

function useShowNav() {
  const { user, loading } = useSession();
  const pathname = usePathname();
  if (loading) return false;
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return false;
  return !!user;
}

/** Renders TopNav + BottomNav only for authenticated non-auth routes */
function NavGuard() {
  const show = useShowNav();
  if (!show) return null;
  return (
    <>
      <TopNav />
      <BottomNav />
    </>
  );
}

/**
 * Wraps page content with the correct padding so it clears the fixed
 * TopNav (top) and BottomNav (bottom) on mobile — but only when those
 * navbars are actually rendered.
 */
function ContentWrapper({ children }: { children: React.ReactNode }) {
  const show = useShowNav();
  return (
    <div className={show ? "pt-14 md:pt-0 pb-16 md:pb-0" : ""}>
      {children}
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NavGuard />
      <ContentWrapper>{children}</ContentWrapper>
      <ComposeModal />
    </SessionProvider>
  );
}
