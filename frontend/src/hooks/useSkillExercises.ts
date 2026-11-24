"use client";

import { useState, useEffect, useRef } from "react";
import {
  getSkillExercises,
  getQuestionTypesSummary,
  type PracticeExerciseItem,
  type QuestionTypeSummaryItem,
} from "@/services/student-test-practice";

const summaryCache = new Map<string, QuestionTypeSummaryItem[]>();
const exercisesCache = new Map<string, { items: PracticeExerciseItem[]; total: number }>();

export function useSkillExercises(
  skill: string,
  selectedQuestionType: string | null,
  page: number = 1,
  limit: number = 12
) {
  const sLower = skill.toLowerCase();
  const cacheKey = `${sLower}_${selectedQuestionType || "all"}_${page}_${limit}`;
  const initialEntry = exercisesCache.get(cacheKey);

  const [typesSummary, setTypesSummary] = useState<QuestionTypeSummaryItem[]>(
    () => summaryCache.get(sLower) || []
  );
  const [exercises, setExercises] = useState<PracticeExerciseItem[]>(() => initialEntry?.items || []);
  const [total, setTotal] = useState<number>(() => initialEntry?.total || 0);
  const [loading, setLoading] = useState<boolean>(() => !initialEntry);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(() => !summaryCache.has(sLower));

  const currentReqRef = useRef(cacheKey);
  currentReqRef.current = cacheKey;

  // 1. Tải danh sách tóm tắt loại câu hỏi
  useEffect(() => {
    let mounted = true;
    const sLower = skill.toLowerCase();

    if (summaryCache.has(sLower)) {
      setTypesSummary(summaryCache.get(sLower)!);
      setLoadingTypes(false);
    } else {
      setLoadingTypes(true);
      getQuestionTypesSummary(sLower)
        .then((data) => {
          if (!mounted) return;
          summaryCache.set(sLower, data);
          setTypesSummary(data);
        })
        .catch((err) => {
          console.warn("Lỗi khi tải question types summary:", err);
        })
        .finally(() => {
          if (mounted) setLoadingTypes(false);
        });
    }

    return () => {
      mounted = false;
    };
  }, [skill]);

  // 2. Tải danh sách bài tập theo kỹ năng, dạng câu hỏi và phân trang
  useEffect(() => {
    let mounted = true;
    const reqKey = `${skill.toLowerCase()}_${selectedQuestionType || "all"}_${page}_${limit}`;

    if (exercisesCache.has(reqKey)) {
      const cached = exercisesCache.get(reqKey)!;
      setExercises(cached.items);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    getSkillExercises({
      skill: skill.toLowerCase(),
      question_type: selectedQuestionType || undefined,
      page,
      limit,
    })
      .then((data) => {
        if (!mounted || currentReqRef.current !== reqKey) return;
        exercisesCache.set(reqKey, { items: data.items, total: data.total });
        setExercises(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        console.warn("Lỗi khi tải bài tập luyện dạng:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [skill, selectedQuestionType, page, limit]);

  return {
    typesSummary,
    exercises,
    total,
    loading,
    loadingTypes,
  };
}
