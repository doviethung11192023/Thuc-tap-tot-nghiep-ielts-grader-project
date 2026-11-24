import { getTestExamContentDirect } from "./student-test-practice";

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút
const MAX_CACHE_ENTRIES = 6; // Giới hạn LRU tránh phình RAM tab trình duyệt khi hover nhiều thẻ
const examCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Lấy dữ liệu đề thi từ RAM Cache nếu còn hiệu lực (cập nhật vị trí LRU)
 */
export function getExamContentCache(testId: string): unknown {
  if (!testId) return null;
  const entry = examCache.get(testId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    examCache.delete(testId);
    return null;
  }
  examCache.delete(testId);
  examCache.set(testId, entry);
  return entry.data;
}

/**
 * Ghi đè hoặc lưu trữ đề thi vào bộ nhớ tạm (có xả mục cũ nhất khi vượt ngưỡng LRU)
 */
export function setExamContentCache(testId: string, data: unknown): void {
  if (!testId || !data) return;
  if (examCache.has(testId)) examCache.delete(testId);
  examCache.set(testId, {
    data,
    timestamp: Date.now(),
  });
  while (examCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = examCache.keys().next().value;
    if (oldestKey !== undefined) examCache.delete(oldestKey);
    else break;
  }
}

/**
 * Tải trước đề thi trong nền (Smart Predictive Prefetch)
 * Tự động loại trừ duplicate request khi hover nhiều lần
 */
export async function prefetchExamContent(testId: string): Promise<unknown> {
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
