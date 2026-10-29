"use client";

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { WritingResultsView } from '@/components/exam/WritingResultsView';
import { SpeakingResultsView } from '@/components/exam/SpeakingResultsView';
import { CleanReadingDetailView } from '@/components/exam/clean/CleanReadingDetailView';
import { CleanListeningDetailView } from '@/components/exam/clean/CleanListeningDetailView';
import { mockWritingExamDataset } from '@/mocks/exam-writing';

export default function SkillDetailedResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const skill = (params?.skill as string)?.toLowerCase();
  const testId = params?.testId as string;
  const attemptId = searchParams.get('attemptId') || undefined;
  const parts = searchParams.get('parts')?.split(',') || undefined;

  // Nút thoát / mũi tên quay lại góc trên bên trái: Trở về trang Bảng kết quả tổng quan
  const handleBack = () => {
    const query = [
      attemptId ? `attemptId=${attemptId}` : '',
      parts ? `parts=${parts.join(',')}` : ''
    ].filter(Boolean).join('&');
    router.push(`/test-practice/${skill}/${testId}/summary${query ? `?${query}` : ''}`);
  };

  // Nút làm lại: Quay lại phòng thi làm lại từ đầu
  const handleRetake = () => {
    const partsQuery = parts ? `?parts=${parts.join(',')}` : '';
    router.push(`/test-practice/${skill}/${testId}${partsQuery}`);
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
        onBack={handleBack}
        onRetake={handleRetake}
        attemptId={attemptId}
        selectedParts={parts}
      />
    );
  }

  // Reading: Hiển thị kết quả thật từ attemptId nếu có, hoặc bài thi chuẩn hóa
  return (
    <CleanReadingDetailView
      onBack={handleBack}
      onRetake={handleRetake}
      attemptId={attemptId}
      selectedParts={parts}
    />
  );
}
