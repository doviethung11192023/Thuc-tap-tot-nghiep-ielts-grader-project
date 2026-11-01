"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getLearningProfileOverview,
  getLearningProfileTestPractice,
  updateLearningProfileGoals,
} from "@/services/learning-profile";
import type {
  LearningProfileOverviewData,
  LearningProfileTestPracticeData,
  GoalUpdatePayload,
} from "@/types/learning-profile";

let cachedOverview: LearningProfileOverviewData | null = null;
let cachedPractice: LearningProfileTestPracticeData | null = null;

export function useLearningProfile() {
  const [overview, setOverview] = useState<LearningProfileOverviewData | null>(() => cachedOverview);
  const [practice, setPractice] = useState<LearningProfileTestPracticeData | null>(() => cachedPractice);
  const [loading, setLoading] = useState<boolean>(() => !cachedOverview);
  const [savingGoal, setSavingGoal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      cachedOverview = null;
      cachedPractice = null;
    }
    if (!cachedOverview) setLoading(true);
    setError(null);
    try {
      const ovPromise = getLearningProfileOverview().then((ovData) => {
        cachedOverview = ovData;
        setOverview(ovData);
        setLoading(false);
        return ovData;
      });

      const prPromise = getLearningProfileTestPractice().then((prData) => {
        cachedPractice = prData;
        setPractice(prData);
        return prData;
      });

      await Promise.all([ovPromise, prPromise]);
    } catch (err: any) {
      console.warn("Lỗi tải Learning Profile:", err);
      setError(err?.response?.data?.detail || "Không thể tải dữ liệu Learning Profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const saveGoals = async (payload: GoalUpdatePayload) => {
    setSavingGoal(true);
    try {
      await updateLearningProfileGoals(payload);
      await fetchProfileData();
      return true;
    } catch (err: any) {
      alert("Lỗi khi lưu mục tiêu: " + (err?.response?.data?.detail || err.message));
      return false;
    } finally {
      setSavingGoal(false);
    }
  };

  return {
    overview,
    practice,
    loading,
    savingGoal,
    error,
    refresh: () => fetchProfileData(true),
    saveGoals,
  };
}
