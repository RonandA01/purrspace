import { PostDetailView } from "@/components/PostDetailView";
import { Sidebar } from "@/components/Sidebar";
import { RightPanel } from "@/components/RightPanel";

interface Props {
  params: Promise<{ post_id: string }>;
  searchParams: Promise<{ comment?: string }>;
}

export default async function PostPage({ params, searchParams }: Props) {
  const { post_id } = await params;
  const { comment } = await searchParams;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex flex-1 justify-center overflow-y-auto">
        <div className="w-full max-w-xl px-4 py-6">
          <PostDetailView postId={post_id} highlightCommentId={comment} />
        </div>
      </main>
      <RightPanel />
    </div>
  );
}
