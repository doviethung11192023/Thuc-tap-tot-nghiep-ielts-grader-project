import { useState, useEffect } from "react";
import { getStudentExamCollections, getStudentExamCollectionDetail } from "@/services/student-test-practice";
import type { ExamCollection } from "@/types/test-practice";

const STORAGE_KEY = "moonlab_cache_collections";
let memoryCollections: ExamCollection[] | null = null;
const detailCache = new Map<string, ExamCollection>();

function getInitialCollections(): ExamCollection[] {
  if (memoryCollections && memoryCollections.length > 0) {
    return memoryCollections;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCollections = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return [];
}

export function useExamCollections() {
  const [collections, setCollections] = useState<ExamCollection[]>(getInitialCollections);
  const [loading, setLoading] = useState<boolean>(() => collections.length === 0);

  useEffect(() => {
    let mounted = true;
    if (!memoryCollections || memoryCollections.length === 0) {
      setLoading(true);
    }

    getStudentExamCollections()
      .then((data) => {
        if (!mounted) return;
        const valid = Array.isArray(data) ? data : [];
        memoryCollections = valid;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
          } catch {}
        }
        setCollections(valid);
      })
      .catch(() => {
        if (!mounted) return;
        if (!memoryCollections || memoryCollections.length === 0) {
          setCollections([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { collections, loading };
}

export function useExamCollectionDetail(setId: string) {
  const [collection, setCollection] = useState<ExamCollection | null>(() => detailCache.get(setId) || null);
  const [loading, setLoading] = useState<boolean>(() => !detailCache.has(setId));

  useEffect(() => {
    let mounted = true;
    if (!detailCache.has(setId)) {
      setLoading(true);
    }

    getStudentExamCollectionDetail(setId)
      .then((data) => {
        if (!mounted) return;
        if (data) {
          detailCache.set(setId, data);
          setCollection(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [setId]);

  return { collection, loading };
}
