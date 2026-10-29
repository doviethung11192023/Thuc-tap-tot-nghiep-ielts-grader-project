import { useState, useEffect } from "react";
import { getStudentExamCollections, getStudentExamCollectionDetail } from "@/services/student-test-practice";
import { mockExamCollections } from "@/mocks/test-sets";
import type { ExamCollection } from "@/types/test-practice";

export function useExamCollections() {
  const [collections, setCollections] = useState<ExamCollection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getStudentExamCollections()
      .then((data) => {
        if (mounted) {
          setCollections(data?.length ? data : mockExamCollections);
        }
      })
      .catch(() => {
        if (mounted) setCollections(mockExamCollections);
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
  const fallback = mockExamCollections.find((c) => c.id === setId) || mockExamCollections[0];
  const [collection, setCollection] = useState<ExamCollection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getStudentExamCollectionDetail(setId)
      .then((data) => {
        if (mounted) {
          setCollection(data || fallback);
        }
      })
      .catch(() => {
        if (mounted) setCollection(fallback);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [setId, fallback]);

  return { collection: collection || fallback, loading };
}
