import { getTestExamContentDirect } from "./student-test-practice";

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút
const examCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Lấy dữ liệu đề thi từ RAM Cache nếu còn hiệu lực
 */
export function getExamContentCache(testId: string): any | null {
  if (!testId) return null;
  const entry = examCache.get(testId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    examCache.delete(testId);
    return null;
  }
  return entry.data;
}

/**
 * Ghi đè hoặc lưu trữ đề thi vào bộ nhớ tạm
 */
export function setExamContentCache(testId: string, data: any): void {
  if (!testId || !data) return;
  examCache.set(testId, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Tải trước đề thi trong nền (Smart Predictive Prefetch)
 * Tự động loại trừ duplicate request khi hover nhiều lần
 */
export async function prefetchExamContent(testId: string): Promise<any> {
  if (!testId) return null;

  // 1. Kiểm tra cache có sẵn
  const cached = getExamContentCache(testId);
  if (cached) return cached;

  // 2. Kiểm tra nếu request đang chạy dở
  const existingPromise = inFlightRequests.get(testId);
  if (existingPromise) return existingPromise;

  // 3. Khởi tạo request nạp ngầm
  const requestPromise = getTestExamContentDirect(testId)
    .then((data) => {
      if (data) setExamContentCache(testId, data);
      return data;
    })
    .catch((err) => {
      console.warn(`[Prefetch] Không thể tải trước đề ${testId}:`, err);
      return null;
    })
    .finally(() => {
      inFlightRequests.delete(testId);
    });

  inFlightRequests.set(testId, requestPromise);
  return requestPromise;
}
