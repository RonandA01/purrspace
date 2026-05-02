import { Suspense } from "react";
import { MessagesView } from "@/components/MessagesView";
import { Sidebar } from "@/components/Sidebar";

export default function MessagesPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <MessagesView />
        </Suspense>
      </main>
    </div>
  );
}
