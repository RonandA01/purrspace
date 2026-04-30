import { SavedView } from "@/components/SavedView";
import { Sidebar } from "@/components/Sidebar";
import { RightPanel } from "@/components/RightPanel";

export default function SavedPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex flex-1 justify-center overflow-y-auto">
        <div className="w-full max-w-xl px-4 py-6">
          <SavedView />
        </div>
      </main>
      <RightPanel />
    </div>
  );
}
