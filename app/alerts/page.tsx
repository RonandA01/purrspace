import { AlertsView } from "@/components/AlertsView";
import { Sidebar } from "@/components/Sidebar";
import { RightPanel } from "@/components/RightPanel";

export default function AlertsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex flex-1 justify-center overflow-y-auto">
        <div className="w-full max-w-xl px-4 py-6">
          <AlertsView />
        </div>
      </main>
      <RightPanel />
    </div>
  );
}
