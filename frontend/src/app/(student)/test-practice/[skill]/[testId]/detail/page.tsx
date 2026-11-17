"use client";

import React, { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SpeakingResultsView } from '@/components/exam/SpeakingResultsView';
import { CleanReadingDetailView } from '@/components/exam/clean/CleanReadingDetailView';
import { CleanListeningDetailView } from '@/components/exam/clean/CleanListeningDetailView';

export default function SkillDetailedResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const skill = (params?.skill as string)?.toLowerCase();
  const testId = params?.testId as string;
  const attemptId = searchParams.get('attemptId') || undefined;
  const parts = searchParams.get('parts')?.split(',') || undefined;
  const returnUrl = searchParams.get('returnUrl') || undefined;

  // Nút thoát / mũi tên quay lại góc trên bên trái: Trở về trang Bảng kết quả tổng quan
  const handleBack = () => {
    const query = [
      attemptId ? `attemptId=${attemptId}` : '',
      parts ? `parts=${parts.join(',')}` : '',
      returnUrl ? `returnUrl=${encodeURIComponent(returnUrl)}` : ''
    ].filter(Boolean).join('&');
    router.push(`/test-practice/${skill}/${testId}/summary${query ? `?${query}` : ''}`);
  };

  // Nút làm lại: Quay lại phòng thi làm lại từ đầu
  const handleRetake = () => {
    const query = [
      parts ? `parts=${parts.join(',')}` : '',
      returnUrl ? `returnUrl=${encodeURIComponent(returnUrl)}` : ''
    ].filter(Boolean).join('&');
    router.push(`/test-practice/${skill}/${testId}${query ? `?${query}` : ''}`);
  };

  const essayId = searchParams.get('essayId') || undefined;

  useEffect(() => {
    if (skill !== 'writing') return;
    if (essayId) {
      router.replace(`/results/${essayId}`);
      return;
    }
    const query = [
      attemptId ? `attemptId=${attemptId}` : '',
      returnUrl ? `returnUrl=${encodeURIComponent(returnUrl)}` : '',
    ].filter(Boolean).join('&');
    router.replace(`/test-practice/writing/${testId}/summary${query ? `?${query}` : ''}`);
  }, [skill, essayId, attemptId, testId, returnUrl, router]);

  if (skill === 'writing') {
    return null;
  }

  if (skill === 'speaking') {
    return (
      <SpeakingResultsView
        attemptId={attemptId}
        backUrl={`/test-practice/speaking/${testId}/summary?attemptId=${attemptId}${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
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
