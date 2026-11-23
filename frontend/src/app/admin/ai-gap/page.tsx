"use client";

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { GapCasesView } from "@/components/admin/ai-services/monitoring/GapCasesView";

export default function AdminAiGapPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#932120]" /></div>}>
      <GapCasesView />
    </Suspense>
  );
}
