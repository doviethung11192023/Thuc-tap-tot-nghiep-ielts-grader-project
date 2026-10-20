"use client";

import React from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { WritingWorkspace } from '@/components/exam/WritingWorkspace';

export default function WritingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'exam';

  const handleSubmit = (text: string) => {
    // Điều hướng sang Màn hình Kết Quả Tóm Tắt (Summary Result) làm điểm giao
    router.push(`/test-practice/writing/${testId}/summary`);
  };

  return (
    <WritingWorkspace
      mode={mode}
      onSubmit={handleSubmit}
    />
  );
}

