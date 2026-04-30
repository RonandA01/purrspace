import { Suspense } from "react";
import { CatAuth } from "@/components/CatAuth";
import { PawPrintIcon } from "@/components/PawPrintIcon";

export const metadata = {
  title: "Sign in · PurrSpace",
};

function LoginFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span className="animate-pulse text-paw-pink">
          <PawPrintIcon size={32} />
        </span>
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <CatAuth />
    </Suspense>
  );
}
