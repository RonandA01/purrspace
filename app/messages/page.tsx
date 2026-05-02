import { Suspense } from "react";
import { MessagesView } from "@/components/MessagesView";
import { Sidebar } from "@/components/Sidebar";

export default function MessagesPage() {
  return (
    // On mobile: subtract TopNav (3.5rem) + BottomNav (4rem) from viewport height
    // On desktop: full screen height (no mobile navbars)
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] md:h-screen bg-background">
      <Sidebar />
      <main className="flex flex-1 overflow-hidden h-full">
        <Suspense fallback={null}>
          <MessagesView />
        </Suspense>
      </main>
    </div>
  );
}
