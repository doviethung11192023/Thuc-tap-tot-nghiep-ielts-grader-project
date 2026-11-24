/**
 * Cache danh mục phía Learner (danh sách đề, bài tập theo dạng) trong bộ nhớ + sessionStorage.
 *
 * - Request trùng khoá đang chạy thì dùng chung một promise (StrictMode mount hai lần, hay nhiều
 *   component cùng cần một danh mục, chỉ tốn một request).
 * - Dữ liệu cũ vẫn trả ngay; quá TTL thì người gọi tải lại ở nền (stale-while-revalidate).
 * - Chỉ ghi cache khi tải thành công, để lỗi mạng không bị nhớ thành "danh sách rỗng".
 */

export interface CatalogCacheEntry<T> {
  data: T;
  ts: number;
}

const STORAGE_PREFIX = "moonlab_catalog_";
const memory = new Map<string, CatalogCacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function readCatalogCache<T>(key: string): CatalogCacheEntry<T> | null {
  const inMemory = memory.get(key) as CatalogCacheEntry<T> | undefined;
  if (inMemory) return inMemory;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogCacheEntry<T>;
    if (parsed && typeof parsed.ts === "number" && parsed.data !== undefined) {
      memory.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

export function isCatalogCacheFresh(entry: CatalogCacheEntry<unknown> | null, ttlMs: number): boolean {
  return !!entry && Date.now() - entry.ts < ttlMs;
}

/** Tải qua `loader`, gộp các lần gọi trùng khoá đang chạy, ghi cache khi thành công. */
export function loadCatalog<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;

  const promise = loader()
    .then((data) => {
      const entry: CatalogCacheEntry<T> = { data, ts: Date.now() };
      memory.set(key, entry);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
        } catch {}
      }
      return data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
