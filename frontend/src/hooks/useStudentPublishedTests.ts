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
const STORAGE_PREFIX = "moonlab_cache_tests_";

function getCachedEntry(cacheKey: string): CacheEntry | null {
  const inMem = listCache.get(cacheKey);
  if (inMem) return inMem;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`${STORAGE_PREFIX}${cacheKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as CacheEntry;
        if (parsed?.items && typeof parsed?.total === "number") {
          listCache.set(cacheKey, parsed);
          return parsed;
        }
      }
    } catch {}
  }
  return null;
}

export function useStudentPublishedTests(initialLimit: number = 12) {
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(initialLimit);
  const [skill, setSkill] = useState<string>("All");
  const [difficulty, setDifficulty] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  const defaultKey = `1_${initialLimit}_All_All_`;
  const initialCached = getCachedEntry(defaultKey);

  const [tests, setTests] = useState<PublishedTestItem[]>(() => initialCached?.items || []);
  const [total, setTotal] = useState<number>(() => initialCached?.total || 0);
  const [loading, setLoading] = useState<boolean>(() => !initialCached);

  const fetchTests = useCallback(async () => {
    const cacheKey = `${page}_${limit}_${skill}_${difficulty}_${search.trim()}`;
    const cached = getCachedEntry(cacheKey);

    // Stale-While-Revalidate: Hiển thị ngay 0ms nếu có cache
    if (cached) {
      setTests(cached.items);
      setTotal(cached.total);
      setLoading(false);
      // Nếu cache còn mới thì không cần fetch lại
      if (Date.now() - cached.ts < CACHE_TTL_MS) {
        return;
      }
    } else {
      setLoading(true);
    }

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
      const entry: CacheEntry = { items, total: totalCount, ts: Date.now() };

      listCache.set(cacheKey, entry);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`${STORAGE_PREFIX}${cacheKey}`, JSON.stringify(entry));
        } catch {}
      }

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
