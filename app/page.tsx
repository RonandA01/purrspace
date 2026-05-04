import { Sidebar } from "@/components/Sidebar";
import { Feed } from "@/components/Feed";
import { ComposeBox } from "@/components/ComposeBox";
import { RightPanel } from "@/components/RightPanel";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex flex-1 justify-center overflow-y-auto">
        <div className="w-full max-w-xl px-4 py-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-lg font-bold">Home Feed</h1>
            <span className="text-muted-foreground text-sm">· your purrsonal timeline</span>
          </div>

          <ComposeBox />

          <Feed />
        </div>
      </main>

      {/* Right panel */}
      <RightPanel />
    </div>
  );
}
