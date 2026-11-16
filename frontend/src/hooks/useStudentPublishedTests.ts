"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { getAllStudentPublishedTests } from "@/services/student-test-practice";
import { isCatalogCacheFresh, loadCatalog, readCatalogCache } from "@/services/catalog-session-cache";
import type { PublishedTestItem } from "@/types/test-practice";

/**
 * Danh sách đề Practice cho tab "Khám phá đề thi thực tế".
 *
 * Kho đề nhỏ (vài chục đề), nên tải cả danh mục một lần rồi lọc kỹ năng / độ khó / tìm kiếm và phân
 * trang ngay trên trình duyệt: bấm lọc có kết quả tức thì, gõ tìm kiếm không gửi request theo từng phím.
 * Số đếm cạnh mỗi nút tính theo các bộ lọc còn lại (faceted), để biết trước lựa chọn nào có đề.
 */

const CATALOG_KEY = "published_tests_v1";
const CATALOG_TTL_MS = 60 * 1000;

export type FacetCounts = Record<string, number>;

const normalize = (value: string) => value.trim().toLowerCase();

function countBy(items: PublishedTestItem[], pick: (t: PublishedTestItem) => string | undefined): FacetCounts {
  const counts: FacetCounts = { All: items.length };
  for (const item of items) {
    const key = normalize(pick(item) || "");
    if (key) counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function useStudentPublishedTests(limit: number = 12) {
  const [page, setPage] = useState<number>(1);
  const [skill, setSkillState] = useState<string>("All");
  const [difficulty, setDifficultyState] = useState<string>("All");
  const [search, setSearchState] = useState<string>("");

  const [catalog, setCatalog] = useState<PublishedTestItem[]>(
    () => readCatalogCache<PublishedTestItem[]>(CATALOG_KEY)?.data || []
  );
  const [loading, setLoading] = useState<boolean>(() => !readCatalogCache(CATALOG_KEY));

  const refresh = useCallback(
    () =>
      loadCatalog(CATALOG_KEY, getAllStudentPublishedTests)
        .then(setCatalog)
        .catch((err) => console.warn("Lỗi tải danh sách đề thi đã xuất bản:", err))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    // Cache còn mới thì thôi; cũ thì vẫn hiển thị và tải lại ở nền (stale-while-revalidate)
    if (isCatalogCacheFresh(readCatalogCache(CATALOG_KEY), CATALOG_TTL_MS)) return;
    let cancelled = false;
    loadCatalog(CATALOG_KEY, getAllStudentPublishedTests)
      .then((items) => { if (!cancelled) setCatalog(items); })
      .catch((err) => console.warn("Lỗi tải danh sách đề thi đã xuất bản:", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Giữ ô tìm kiếm mượt khi gõ; phần lọc chạy với giá trị trễ một nhịp render
  const deferredSearch = useDeferredValue(search);

  const { tests, total, skillCounts, difficultyCounts } = useMemo(() => {
    const query = normalize(deferredSearch);
    const skillKey = normalize(skill);
    const difficultyKey = normalize(difficulty);

    const matchesSearch = (t: PublishedTestItem) => !query || t.title.toLowerCase().includes(query);
    const matchesSkill = (t: PublishedTestItem) => skillKey === "all" || t.skill === skillKey;
    const matchesDifficulty = (t: PublishedTestItem) =>
      difficultyKey === "all" || (t.difficulty || "") === difficultyKey;

    const searched = catalog.filter(matchesSearch);
    const filtered = searched.filter((t) => matchesSkill(t) && matchesDifficulty(t));
    const start = (page - 1) * limit;

    return {
      tests: filtered.slice(start, start + limit),
      total: filtered.length,
      skillCounts: countBy(searched.filter(matchesDifficulty), (t) => t.skill),
      difficultyCounts: countBy(searched.filter(matchesSkill), (t) => t.difficulty),
    };
  }, [catalog, deferredSearch, skill, difficulty, page, limit]);

  return {
    page,
    setPage,
    limit,
    skill,
    setSkill: (s: string) => { setSkillState(s); setPage(1); },
    difficulty,
    setDifficulty: (d: string) => { setDifficultyState(d); setPage(1); },
    search,
    setSearch: (s: string) => { setSearchState(s); setPage(1); },
    tests,
    total,
    /** Tổng số đề trong kho, không phụ thuộc bộ lọc */
    catalogTotal: catalog.length,
    skillCounts,
    difficultyCounts,
    loading,
    refresh,
  };
}
