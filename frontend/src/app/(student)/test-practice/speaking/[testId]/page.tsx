"use client";

import React from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { SpeakingWorkspace } from '@/components/exam/SpeakingWorkspace';

export default function SpeakingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'exam';

  const handleSubmit = () => {
    // Điều hướng sang Màn hình Kết Quả Tóm Tắt (Summary Result) làm điểm giao
    router.push(`/test-practice/speaking/${testId}/summary`);
  };

  return (
    <SpeakingWorkspace
      mode={mode}
      onSubmit={handleSubmit}
    />
  );
}

