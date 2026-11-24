"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

type EssayMap = Record<1 | 2, string>;

/**
 * FR-11: Tự động lưu nháp Writing cục bộ cho cả chế độ Luyện tập (practice) và Thi thử (exam/mock).
 */
export function useWritingDraftAutoSave(testId: string | undefined, mode: 'exam' | 'practice') {
  const draftKey = `ielts_writing_draft_${testId || 'default'}_${mode}`;
  const [taskEssays, setTaskEssays] = useState<EssayMap>({ 1: '', 2: '' });
  const [autoSaveTime, setAutoSaveTime] = useState<string>('Vừa xong');
  const taskEssaysRef = useRef<EssayMap>(taskEssays);
  taskEssaysRef.current = taskEssays;

  useEffect(() => {
    try {
      localStorage.removeItem('ielts_writing_draft_mock');
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const p = JSON.parse(saved);
        setTaskEssays(
          typeof p === 'object' && p ? { 1: p[1] || '', 2: p[2] || '' } : { 1: '', 2: String(p) }
        );
      }
    } catch {
      // Bỏ qua lỗi đọc localStorage nếu trình duyệt chặn storage
    }
  }, [draftKey]);

  const stampSaved = useCallback(() => {
    setAutoSaveTime(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, []);

  const saveDraftNow = useCallback(
    (payload?: EssayMap) => {
      try {
        const data = payload ?? taskEssaysRef.current;
        localStorage.setItem(draftKey, JSON.stringify(data));
        stampSaved();
        return true;
      } catch {
        return false;
      }
    },
    [draftKey, stampSaved]
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore cleanup error
    }
  }, [draftKey]);

  // Lưu nháp sau khi ngừng gõ 1.5s trên cả hai chế độ
  useEffect(() => {
    if (!taskEssays[1]?.trim() && !taskEssays[2]?.trim()) return;
    const t = setTimeout(() => {
      saveDraftNow(taskEssays);
    }, 1500);
    return () => clearTimeout(t);
  }, [taskEssays, saveDraftNow]);

  // Sao lưu định kỳ mỗi 15 giây trong suốt phiên làm bài
  useEffect(() => {
    const timer = setInterval(() => {
      const cur = taskEssaysRef.current;
      if (cur[1]?.trim() || cur[2]?.trim()) {
        saveDraftNow(cur);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [saveDraftNow]);

  return {
    taskEssays,
    setTaskEssays,
    taskEssaysRef,
    autoSaveTime,
    saveDraftNow,
    clearDraft,
  };
}
