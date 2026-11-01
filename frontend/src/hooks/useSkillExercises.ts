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

export function useSkillExercises(skill: string, selectedQuestionType: string | null) {
  const sLower = skill.toLowerCase();
  const cacheKey = `${sLower}_${selectedQuestionType || "all"}`;
  const initialEntry = exercisesCache.get(cacheKey);

  const [typesSummary, setTypesSummary] = useState<QuestionTypeSummaryItem[]>(
    () => summaryCache.get(sLower) || []
  );
  const [exercises, setExercises] = useState<PracticeExerciseItem[]>(() => initialEntry?.items || []);
  const [total, setTotal] = useState<number>(() => initialEntry?.total || 0);
  const [loading, setLoading] = useState<boolean>(() => !initialEntry);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(() => !summaryCache.has(sLower));

  const currentSkillRef = useRef(skill);
  currentSkillRef.current = skill;

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

  // 2. Tải danh sách bài tập theo kỹ năng và dạng câu hỏi
  useEffect(() => {
    let mounted = true;
    const sLower = skill.toLowerCase();
    const cacheKey = `${sLower}_${selectedQuestionType || "all"}`;

    if (exercisesCache.has(cacheKey)) {
      const cached = exercisesCache.get(cacheKey)!;
      setExercises(cached.items);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    getSkillExercises({
      skill: sLower,
      question_type: selectedQuestionType || undefined,
      limit: 20,
    })
      .then((data) => {
        if (!mounted || currentSkillRef.current !== skill) return;
        exercisesCache.set(cacheKey, { items: data.items, total: data.total });
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
  }, [skill, selectedQuestionType]);

  return {
    typesSummary,
    exercises,
    total,
    loading,
    loadingTypes,
  };
}
