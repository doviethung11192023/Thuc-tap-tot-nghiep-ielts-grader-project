"use client";

import React from "react";
import { useParams } from "next/navigation";
import { RunDetailView } from "@/components/admin/ai-services/monitoring/RunDetailView";

export default function AdminAiRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  return <RunDetailView runId={runId} />;
}
