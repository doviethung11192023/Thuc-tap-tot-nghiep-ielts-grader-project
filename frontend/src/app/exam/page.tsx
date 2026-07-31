import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Providers from "@/components/Providers";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function ExamPage() {
  return (
    <Providers>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-zinc-50">
          <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
        </div>
      }>
        <WorkspaceLayout />
      </Suspense>
    </Providers>
  );
}
