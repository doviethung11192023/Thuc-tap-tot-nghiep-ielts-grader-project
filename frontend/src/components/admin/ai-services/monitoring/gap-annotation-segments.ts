// Chia bài viết thành các đoạn theo vị trí lỗi do AI và Expert đánh dấu (có thể chồng lên nhau).
import type { GapAnnotation } from "@/types/admin-ai-monitoring";

export interface TextSegment {
  text: string;
  /** Các lỗi phủ lên đoạn này (rỗng = chữ thường). */
  marks: GapAnnotation[];
}

/** Bỏ lỗi thiếu hoặc sai vị trí; cắt vị trí vào độ dài bài. */
function validMarks(content: string, annotations: GapAnnotation[]): (GapAnnotation & { start_pos: number; end_pos: number })[] {
  const out: (GapAnnotation & { start_pos: number; end_pos: number })[] = [];
  for (const a of annotations) {
    if (a.start_pos === null || a.end_pos === null) continue;
    const start = Math.max(0, a.start_pos);
    const end = Math.min(content.length, a.end_pos);
    if (end > start) out.push({ ...a, start_pos: start, end_pos: end });
  }
  return out;
}

export function buildSegments(content: string, annotations: GapAnnotation[]): TextSegment[] {
  const marks = validMarks(content, annotations);
  const cuts = new Set<number>([0, content.length]);
  marks.forEach((m) => { cuts.add(m.start_pos); cuts.add(m.end_pos); });
  const points = Array.from(cuts).sort((a, b) => a - b);
  const segments: TextSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [from, to] = [points[i], points[i + 1]];
    segments.push({ text: content.slice(from, to), marks: marks.filter((m) => m.start_pos <= from && m.end_pos >= to) });
  }
  return segments;
}
