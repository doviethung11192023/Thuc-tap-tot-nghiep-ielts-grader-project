"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyHistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/test-practice/history");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="h-6 w-6 border-2 border-zinc-300 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
}
