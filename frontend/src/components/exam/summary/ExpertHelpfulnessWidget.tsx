"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { getAttemptExpertRating, submitAttemptExpertRating } from "@/services/expert";
import { extractApiErrorMessage } from "@/lib/api-error";

const TAG_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "clear_actionable", label: "Nhận xét dễ hiểu" },
  { id: "detailed_errors", label: "Chỉ lỗi chi tiết" },
  { id: "too_brief", label: "Hơi ngắn gọn" },
  { id: "unclear", label: "Chưa rõ cách sửa" },
];

export function ExpertHelpfulnessWidget({ attemptId }: { attemptId: string }) {
  const queryClient = useQueryClient();
  const [readyAfterDelay, setReadyAfterDelay] = useState(false);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["expert-helpfulness-rating", attemptId],
    queryFn: () => getAttemptExpertRating(attemptId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (existing?.rated) return;
    const timer = window.setTimeout(() => {
      setReadyAfterDelay(true);
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [attemptId, existing?.rated]);

  if (existing?.rated) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs text-emerald-900 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
        <span>
          Cảm ơn đánh giá của bạn (
          <strong>{existing.rating?.is_helpful ? "Hữu ích" : "Cần rõ hơn"}</strong>
          ) — phản hồi giúp Chuyên gia cải thiện nhận xét cho học viên sau.
        </span>
      </div>
    );
  }

  if (!readyAfterDelay) return null;

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleSubmit = async () => {
    if (isHelpful === null) return;
    try {
      setSubmitting(true);
      await submitAttemptExpertRating(attemptId, {
        is_helpful: isHelpful,
        tags: selectedTags,
      });
      await queryClient.invalidateQueries({ queryKey: ["expert-helpfulness-rating", attemptId] });
      toast.success("Cảm ơn bạn đã gửi đánh giá ẩn danh!");
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Không thể gửi đánh giá lúc này"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-[#FAF8F5] p-3.5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-zinc-900">
            Nhận xét của Chuyên gia có giúp bạn hiểu cách cải thiện bài này không?
          </p>
          <p className="text-[11px] text-zinc-500">
            Đánh giá ẩn danh 1 lần, không ảnh hưởng tới điểm Band chính thức của bạn.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsHelpful(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              isHelpful === true
                ? "bg-emerald-600 text-white border-emerald-700"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-emerald-50"
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" /> Hữu ích
          </button>
          <button
            type="button"
            onClick={() => setIsHelpful(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              isHelpful === false
                ? "bg-[#932120] text-white border-[#7a1a19]"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-red-50"
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" /> Cần rõ hơn
          </button>
        </div>
      </div>

      {isHelpful !== null && (
        <div className="space-y-2.5 pt-2 border-t border-zinc-200/80">
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((tag) => {
              const active = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors ${
                    active
                      ? "bg-[#932120] text-white border-[#7a1a19]"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="px-4 py-1.5 bg-[#932120] hover:bg-[#7a1a19] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Gửi đánh giá
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
