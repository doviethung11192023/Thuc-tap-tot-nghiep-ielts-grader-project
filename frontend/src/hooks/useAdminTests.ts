import { useState, useEffect, useCallback, useTransition } from "react";
import {
  getTests,
  getTestSets,
  updateTestStatus,
  bulkUpdateTestStatus,
  deleteTest,
} from "@/services/admin-content";
import type { TestItem, TestSet, SkillType, ContentStatus, AllowedMode } from "@/types/exam";
import toast from "react-hot-toast";

interface CacheEntry {
  items: TestItem[];
  total: number;
}
const testsCacheMap = new Map<string, CacheEntry>();

export function useAdminTests() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [skill, setSkill] = useState<SkillType | undefined>(undefined);
  const [status, setStatus] = useState<ContentStatus | undefined>(undefined);
  const [testSetId, setTestSetId] = useState<string | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<string | undefined>(undefined);
  const [allowedMode, setAllowedMode] = useState<AllowedMode | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [search, setSearch] = useState("");

  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const cacheKey = `${page}_${limit}_${skill || ""}_${status || ""}_${testSetId || ""}_${difficulty || ""}_${allowedMode || ""}_${sortBy}_${search.trim()}`;
  const initialCached = testsCacheMap.get(cacheKey);

  const [tests, setTests] = useState<TestItem[]>(() => initialCached?.items || []);
  const [total, setTotal] = useState<number>(() => initialCached?.total || 0);
  const [loading, setLoading] = useState<boolean>(() => !initialCached);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPendingTransition, startTransition] = useTransition();

  useEffect(() => {
    getTestSets().then(setTestSets).catch(() => {});
  }, []);

  const fetchTests = useCallback(
    async (isSilent = false) => {
      const key = `${page}_${limit}_${skill || ""}_${status || ""}_${testSetId || ""}_${difficulty || ""}_${allowedMode || ""}_${sortBy}_${search.trim()}`;
      if (!testsCacheMap.has(key) && !isSilent) setLoading(true);
      else setIsRefreshing(true);

      try {
        const data = await getTests({
          page, limit, skill, status, test_set_id: testSetId, difficulty, allowed_mode: allowedMode, sort_by: sortBy, search: search.trim() || undefined
        });
        setTests(data.items);
        setTotal(data.total);
        testsCacheMap.set(key, { items: data.items, total: data.total });
      } catch (err) {
        console.error("Failed to fetch tests:", err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, skill, status, testSetId, difficulty, allowedMode, sortBy, search]
  );

  useEffect(() => {
    const key = `${page}_${limit}_${skill || ""}_${status || ""}_${testSetId || ""}_${difficulty || ""}_${allowedMode || ""}_${sortBy}_${search.trim()}`;
    const cached = testsCacheMap.get(key);
    if (cached) {
      setTests(cached.items);
      setTotal(cached.total);
      fetchTests(true);
    } else {
      fetchTests(false);
    }
  }, [fetchTests, page, limit, skill, status, testSetId, difficulty, allowedMode, sortBy, search]);

  const handleTabClick = (newSkill: SkillType | undefined) => {
    startTransition(() => {
      setSkill(newSkill);
      setPage(1);
      setSelectedIds([]);
    });
  };

  const handleStatusChange = async (testId: string, newStatus: ContentStatus) => {
    try {
      await updateTestStatus(testId, newStatus);
      toast.success("Cập nhật trạng thái thành công");
      testsCacheMap.clear();
      fetchTests(true);
    } catch (_) {
      toast.error("Cập nhật trạng thái thất bại");
    }
  };

  const handleBulkStatus = async (newStatus: ContentStatus) => {
    if (selectedIds.length === 0) return;
    try {
      await bulkUpdateTestStatus(selectedIds, newStatus);
      toast.success(`Đã cập nhật ${selectedIds.length} bài thi thành công!`);
      setSelectedIds([]);
      testsCacheMap.clear();
      fetchTests(true);
    } catch (_) {
      toast.error("Lỗi khi cập nhật hàng loạt");
    }
  };

  const handleDelete = async (testId: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa bài thi "${title}"?`)) return;
    try {
      await deleteTest(testId);
      toast.success("Xóa bài thi thành công");
      setSelectedIds((prev) => prev.filter((id) => id !== testId));
      testsCacheMap.clear();
      fetchTests(true);
    } catch (_) {
      toast.error("Xóa bài thi thất bại");
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? tests.map((t) => t.id) : []);
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const resetAllFilters = () => {
    setSkill(undefined);
    setStatus(undefined);
    setTestSetId(undefined);
    setDifficulty(undefined);
    setAllowedMode(undefined);
    setSortBy("newest");
    setSearch("");
    setPage(1);
    setSelectedIds([]);
  };

  const hasActiveFilters = Boolean(
    skill || status || testSetId || difficulty || allowedMode || search || sortBy !== "newest"
  );

  return {
    page, setPage, limit, skill, status, setStatus, testSetId, setTestSetId,
    difficulty, setDifficulty, allowedMode, setAllowedMode, sortBy, setSortBy, search, setSearch,
    tests, total, testSets, selectedIds, loading, isRefreshing, isPendingTransition, hasActiveFilters,
    handleTabClick, handleStatusChange, handleBulkStatus, handleDelete, toggleSelectAll, toggleSelectOne,
    resetAllFilters,
    clearCacheAndRefresh: (silent = false) => {
      testsCacheMap.clear();
      fetchTests(silent);
    },
  };
}
