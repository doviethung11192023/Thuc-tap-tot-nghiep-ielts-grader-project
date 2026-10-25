"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WritingResultsView } from '@/components/exam/WritingResultsView';
import { SpeakingResultsView } from '@/components/exam/SpeakingResultsView';
import { CleanReadingDetailView } from '@/components/exam/clean/CleanReadingDetailView';
import { CleanListeningDetailView } from '@/components/exam/clean/CleanListeningDetailView';
import { mockWritingExamDataset } from '@/mocks/exam-writing';

export default function SkillDetailedResultPage() {
  const params = useParams();
  const router = useRouter();

  const skill = (params?.skill as string)?.toLowerCase();
  const testId = params?.testId as string;

  const handleRetake = () => {
    router.push(`/test-practice/${skill}/${testId}`);
  };

  if (skill === 'writing') {
    return (
      <WritingResultsView
        essayText={mockWritingExamDataset.sample_student_submission}
        onRetake={handleRetake}
      />
    );
  }

  if (skill === 'speaking') {
    return (
      <SpeakingResultsView
        onRetake={handleRetake}
      />
    );
  }

  if (skill === 'listening') {
    return (
      <CleanListeningDetailView
        onRetake={handleRetake}
      />
    );
  }

  // Reading: Sử dụng dữ liệu thật từ clean-dataset (3 Passages, 40 câu hỏi, lời giải 4 bước)
  return (
    <CleanReadingDetailView
      onRetake={handleRetake}
    />
  );
}
