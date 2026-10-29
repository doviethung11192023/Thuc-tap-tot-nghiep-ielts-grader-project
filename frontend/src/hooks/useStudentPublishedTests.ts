"use client";

import { useState, useEffect, useCallback } from "react";
import { getStudentPublishedTests } from "@/services/student-test-practice";
import type { PublishedTestItem } from "@/types/test-practice";

interface CacheEntry {
  items: PublishedTestItem[];
  total: number;
  ts: number;
}

const listCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60s

export function useStudentPublishedTests(initialLimit: number = 12) {
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(initialLimit);
  const [skill, setSkill] = useState<string>("All");
  const [difficulty, setDifficulty] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [tests, setTests] = useState<PublishedTestItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTests = useCallback(async () => {
    const cacheKey = `${page}_${limit}_${skill}_${difficulty}_${search}`;
    const cached = listCache.get(cacheKey);

    // Stale-While-Revalidate: Nếu có cache còn mới, hiển thị ngay tức thì 0ms
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setTests(cached.items);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    if (!cached) setLoading(true);

    try {
      const data = await getStudentPublishedTests({
        page,
        limit,
        skill: skill !== "All" ? skill.toLowerCase() : undefined,
        difficulty: difficulty !== "All" ? difficulty.toLowerCase() : undefined,
        search: search.trim() || undefined,
      });
      const items = data.items || [];
      const totalCount = data.total || 0;

      listCache.set(cacheKey, { items, total: totalCount, ts: Date.now() });
      setTests(items);
      setTotal(totalCount);
    } catch (err) {
      console.warn("Lỗi tải danh sách đề thi đã xuất bản:", err);
      if (!cached) {
        setTests([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, skill, difficulty, search]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  return {
    page,
    setPage,
    limit,
    skill,
    setSkill: (s: string) => { setSkill(s); setPage(1); },
    difficulty,
    setDifficulty: (d: string) => { setDifficulty(d); setPage(1); },
    search,
    setSearch: (s: string) => { setSearch(s); setPage(1); },
    tests,
    total,
    loading,
    refresh: fetchTests,
  };
}
