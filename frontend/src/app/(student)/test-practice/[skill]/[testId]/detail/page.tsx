"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WritingResultsView } from '@/components/exam/WritingResultsView';
import { SpeakingResultsView } from '@/components/exam/SpeakingResultsView';
import { ReadingResultsView } from '@/components/exam/ReadingResultsView';
import { ListeningResultsView } from '@/components/exam/ListeningResultsView';
import { mockWritingExamDataset } from '@/mocks/exam-writing';
import { mockReadingFullTest } from '@/mocks/exam-reading';
import { mockListeningFullTest } from '@/mocks/exam-listening';

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
      <ListeningResultsView
        testData={mockListeningFullTest}
        userAnswers={{}}
        mode="practice"
        onRetake={handleRetake}
      />
    );
  }

  // Default: Reading
  return (
    <ReadingResultsView
      testData={mockReadingFullTest}
      userAnswers={{}}
      mode="practice"
      onRetake={handleRetake}
    />
  );
}
