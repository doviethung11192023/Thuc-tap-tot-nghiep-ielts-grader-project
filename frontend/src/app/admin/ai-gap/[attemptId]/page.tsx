"use client";

import React from "react";
import { useParams } from "next/navigation";
import { GapCaseDetailView } from "@/components/admin/ai-services/monitoring/GapCaseDetailView";

export default function AdminAiGapCasePage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  return <GapCaseDetailView attemptId={attemptId} />;
}
