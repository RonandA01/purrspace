import { ProfileView } from "@/components/ProfileView";
import { Sidebar } from "@/components/Sidebar";
import { RightPanel } from "@/components/RightPanel";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex flex-1 justify-center overflow-y-auto">
        <div className="w-full max-w-xl px-4 py-6">
          <ProfileView username={username} />
        </div>
      </main>
      <RightPanel />
    </div>
  );
}
