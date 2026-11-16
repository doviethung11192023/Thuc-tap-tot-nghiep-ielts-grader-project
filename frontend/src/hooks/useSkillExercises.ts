"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAllSkillExercises,
  type PracticeExerciseItem,
  type QuestionTypeSummaryItem,
} from "@/services/student-test-practice";
import { isCatalogCacheFresh, loadCatalog, readCatalogCache } from "@/services/catalog-session-cache";

/**
 * Bài tập theo dạng cho tab "Luyện theo dạng bài".
 *
 * Mỗi kỹ năng chỉ vài chục bài, nên tải cả kỹ năng một lần (một request, thay cho hai request danh sách
 * dạng bài + bài tập), rồi lọc dạng bài ngay trên trình duyệt. Danh sách dạng bài và số đếm suy ra từ
 * chính các bài đã tải, nên luôn khớp nhau. Sau khi kỹ năng đang xem tải xong thì tải trước các kỹ năng
 * còn lại ở nền, để chuyển tab kỹ năng không phải chờ.
 */

const ALL_SKILLS = ["reading", "listening", "writing", "speaking"];
const EXERCISES_TTL_MS = 60 * 1000;
const cacheKey = (skill: string) => `skill_exercises_v1_${skill}`;

function summarizeTypes(items: PracticeExerciseItem[]): QuestionTypeSummaryItem[] {
  const byType = new Map<string, QuestionTypeSummaryItem>();
  for (const item of items) {
    const existing = byType.get(item.raw_type);
    if (existing) existing.count += 1;
    else byType.set(item.raw_type, { key: item.raw_type, name: item.type, count: 1, accuracy: 0 });
  }
  return [...byType.values()].sort((a, b) => b.count - a.count);
}

function prefetchOtherSkills(current: string) {
  for (const other of ALL_SKILLS) {
    if (other === current || isCatalogCacheFresh(readCatalogCache(cacheKey(other)), EXERCISES_TTL_MS)) continue;
    loadCatalog(cacheKey(other), () => getAllSkillExercises(other)).catch(() => {});
  }
}

export function useSkillExercises(skill: string, selectedQuestionType: string | null) {
  const skillKey = skill.toLowerCase();
  const [itemsBySkill, setItemsBySkill] = useState<Record<string, PracticeExerciseItem[]>>(() => {
    const cached = readCatalogCache<PracticeExerciseItem[]>(cacheKey(skillKey));
    return cached ? { [skillKey]: cached.data } : {};
  });

  useEffect(() => {
    let cancelled = false;
    // Có cache (kể cả cũ) thì lượt render đã đọc thẳng nó; ở đây chỉ tải lại khi quá TTL
    if (isCatalogCacheFresh(readCatalogCache(cacheKey(skillKey)), EXERCISES_TTL_MS)) {
      prefetchOtherSkills(skillKey);
      return;
    }

    loadCatalog(cacheKey(skillKey), () => getAllSkillExercises(skillKey))
      .then((items) => {
        if (!cancelled) setItemsBySkill((prev) => ({ ...prev, [skillKey]: items }));
        prefetchOtherSkills(skillKey);
      })
      .catch((err) => {
        console.warn("Lỗi khi tải bài tập luyện dạng:", err);
        if (!cancelled) setItemsBySkill((prev) => ({ ...prev, [skillKey]: prev[skillKey] || [] }));
      });

    return () => {
      cancelled = true;
    };
  }, [skillKey]);

  // Kỹ năng đã tải trước ở nền: đọc thẳng cache ngay lượt render này, không nháy loader một khung hình
  const allItems =
    itemsBySkill[skillKey] ?? readCatalogCache<PracticeExerciseItem[]>(cacheKey(skillKey))?.data;
  const loading = allItems === undefined;

  const { typesSummary, exercises } = useMemo(() => {
    const items = allItems || [];
    return {
      typesSummary: summarizeTypes(items),
      exercises: selectedQuestionType ? items.filter((it) => it.raw_type === selectedQuestionType) : items,
    };
  }, [allItems, selectedQuestionType]);

  return {
    typesSummary,
    exercises,
    /** Tổng số bài của kỹ năng, không phụ thuộc dạng bài đang lọc */
    total: allItems?.length || 0,
    loading,
    loadingTypes: loading,
  };
}
