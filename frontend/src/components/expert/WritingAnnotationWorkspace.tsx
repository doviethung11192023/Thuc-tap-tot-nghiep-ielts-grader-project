"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Trash2,
  Pencil,
  Plus,
  X,
  Sparkles,
  Info,
  ZoomIn,
} from "lucide-react";
import type { WorkspaceTaskItem, WorkspaceAnnotation } from "@/types";

interface Props {
  tasks: WorkspaceTaskItem[];
  annotations: WorkspaceAnnotation[];
  onChangeAnnotations: (updated: WorkspaceAnnotation[]) => void;
  activeTaskTab: number;
  setActiveTaskTab: (tab: number) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; mark: string }> = {
  TA: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", mark: "bg-blue-100/85 text-blue-950 border-b-2 border-blue-500" },
  TR: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", mark: "bg-blue-100/85 text-blue-950 border-b-2 border-blue-500" },
  CC: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", mark: "bg-amber-100/85 text-amber-950 border-b-2 border-amber-500" },
  LR: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", mark: "bg-emerald-100/85 text-emerald-950 border-b-2 border-emerald-500" },
  GRA: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", mark: "bg-rose-100/85 text-rose-950 border-b-2 border-rose-500" },
};

function getSelectionOffsets(container: HTMLElement, range: Range): { start: number; end: number } | null {
  try {
    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const selectedLen = range.toString().length;
    return { start, end: start + selectedLen };
  } catch {
    return null;
  }
}

export default function WritingAnnotationWorkspace({
  tasks,
  annotations,
  onChangeAnnotations,
  activeTaskTab,
  setActiveTaskTab,
}: Props) {
  const currentTask = tasks[activeTaskTab] || tasks[0];
  const essayContentRef = useRef<HTMLDivElement>(null);

  // Floating quick toolbar when text is selected
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);

  // Unified Create / Edit Annotation Editor state (never clipped!)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [annCategory, setAnnCategory] = useState<"TR" | "TA" | "CC" | "LR" | "GRA">("GRA");
  const [annOriginal, setAnnOriginal] = useState("");
  const [annCorrected, setAnnCorrected] = useState("");
  const [annExplanation, setAnnExplanation] = useState("");
  const [isChartZoomOpen, setIsChartZoomOpen] = useState(false);

  useEffect(() => {
    if (!isChartZoomOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsChartZoomOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isChartZoomOpen]);

  const primaryCat: "TA" | "TR" = currentTask?.task_type === "task1" ? "TA" : "TR";
  const categoryOptions: Array<"TA" | "TR" | "CC" | "LR" | "GRA"> = [primaryCat, "CC", "LR", "GRA"];

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !essayContentRef.current) {
      setToolbarPos(null);
      return;
    }
    const rawText = sel.toString();
    const trimmed = rawText.trim();
    if (trimmed.length < 2) return;

    const range = sel.getRangeAt(0);
    if (!essayContentRef.current.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = essayContentRef.current.getBoundingClientRect();
    setToolbarPos({
      top: Math.max(8, rect.top - containerRect.top - 46),
      left: Math.max(8, Math.min(containerRect.width - 230, rect.left - containerRect.left + rect.width / 2 - 110)),
    });

    const offsets = getSelectionOffsets(essayContentRef.current, range);
    if (offsets) {
      const leadSpaces = rawText.length - rawText.trimStart().length;
      setSelectionRange({
        start: offsets.start + leadSpaces,
        end: offsets.start + leadSpaces + trimmed.length,
      });
    } else {
      const fullText = currentTask?.content || "";
      const idx = fullText.indexOf(trimmed);
      setSelectionRange(idx >= 0 ? { start: idx, end: idx + trimmed.length } : null);
    }
    setSelectedText(trimmed);
  };

  const openCreateFromSelection = (cat: "TR" | "TA" | "CC" | "LR" | "GRA") => {
    setEditingIndex(null);
    setAnnCategory(cat);
    setAnnOriginal(selectedText);
    setAnnCorrected("");
    setAnnExplanation("");
    setToolbarPos(null);
    setEditorOpen(true);
    window.getSelection()?.removeAllRanges();
  };

  const openCreateCustomNote = () => {
    setEditingIndex(null);
    setSelectionRange(null);
    setSelectedText("");
    setToolbarPos(null);
    setAnnCategory(primaryCat);
    setAnnOriginal("");
    setAnnCorrected("");
    setAnnExplanation("");
    setEditorOpen(true);
  };

  const openEditAnnotation = (globalIdx: number) => {
    const target = annotations[globalIdx];
    if (!target) return;
    setEditingIndex(globalIdx);
    const cat = (["TA", "TR", "CC", "LR", "GRA"].includes(target.category) ? target.category : "GRA") as
      | "TR"
      | "TA"
      | "CC"
      | "LR"
      | "GRA";
    setAnnCategory(cat);
    setAnnOriginal(target.original_text || "");
    setAnnCorrected(target.corrected_text || "");
    setAnnExplanation(target.explanation || "");
    setToolbarPos(null);
    setEditorOpen(true);
  };

  const handleSaveAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask || !annExplanation.trim()) return;

    if (editingIndex !== null && annotations[editingIndex]) {
      const updated = [...annotations];
      updated[editingIndex] = {
        ...updated[editingIndex],
        category: annCategory,
        original_text: annOriginal.trim() || updated[editingIndex].original_text || "(Nhận xét chung)",
        corrected_text: annCorrected.trim() || null,
        explanation: annExplanation.trim(),
      };
      onChangeAnnotations(updated);
    } else {
      const newAnn: WorkspaceAnnotation = {
        id: `ann-${Date.now()}`,
        type: "error",
        category: annCategory,
        title: `${annCategory}: Nhận xét chuyên gia`,
        original_text: annOriginal.trim() || "(Nhận xét tổng quát)",
        corrected_text: annCorrected.trim() || null,
        explanation: annExplanation.trim(),
        start_pos: selectionRange?.start ?? null,
        end_pos: selectionRange?.end ?? null,
        essay_id: currentTask.essay_id,
      };
      onChangeAnnotations([...annotations, newAnn]);
    }

    setEditorOpen(false);
    setEditingIndex(null);
    setSelectedText("");
    setSelectionRange(null);
  };

  const handleDeleteByGlobalIdx = (globalIdx: number) => {
    onChangeAnnotations(annotations.filter((_, idx) => idx !== globalIdx));
    if (editingIndex === globalIdx) {
      setEditorOpen(false);
      setEditingIndex(null);
    }
  };

  const taskAnnotationsWithIdx = annotations
    .map((ann, globalIdx) => ({ ann, globalIdx }))
    .filter(({ ann }) => ann.essay_id === currentTask?.essay_id);

  const renderHighlightedEssay = (content: string) => {
    if (!content) return null;
    const spans = taskAnnotationsWithIdx
      .map(({ ann, globalIdx }) => {
        let start = typeof ann.start_pos === "number" ? ann.start_pos : -1;
        let end = typeof ann.end_pos === "number" ? ann.end_pos : -1;
        if (start < 0 || end <= start || end > content.length) {
          const orig = ann.original_text || "";
          const found = orig && orig !== "(Nhận xét tổng quát)" ? content.indexOf(orig) : -1;
          if (found >= 0) {
            start = found;
            end = found + orig.length;
          }
        }
        return { ann, globalIdx, start, end };
      })
      .filter((s) => s.start >= 0 && s.end > s.start && s.end <= content.length)
      .sort((a, b) => a.start - b.start || a.end - b.end);

    if (spans.length === 0) return content;

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    spans.forEach(({ ann, globalIdx, start, end }) => {
      if (start < cursor) return;
      if (start > cursor) {
        nodes.push(<React.Fragment key={`txt-${cursor}`}>{content.slice(cursor, start)}</React.Fragment>);
      }
      const style = CATEGORY_COLORS[ann.category] || CATEGORY_COLORS.GRA;
      nodes.push(
        <mark
          key={`mark-${ann.id || "ann"}-${globalIdx}`}
          onClick={(e) => {
            e.stopPropagation();
            openEditAnnotation(globalIdx);
          }}
          title={`${ann.category}: ${ann.explanation} (Bấm để sửa)`}
          className={`px-0.5 rounded-xs cursor-pointer hover:opacity-80 transition-opacity ${style.mark}`}
        >
          {content.slice(start, end)}
        </mark>
      );
      cursor = end;
    });
    if (cursor < content.length) {
      nodes.push(<React.Fragment key={`txt-end-${cursor}`}>{content.slice(cursor)}</React.Fragment>);
    }
    return nodes;
  };

  const chartUrl = currentTask?.chart_image_url || currentTask?.chart_image_key;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col">
      {/* Task Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-zinc-200 bg-zinc-50/70 rounded-t-2xl">
        <div className="flex items-center gap-2">
          {tasks.map((task, idx) => (
            <button
              key={task.essay_id}
              type="button"
              onClick={() => {
                setActiveTaskTab(idx);
                setEditorOpen(false);
                setToolbarPos(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTaskTab === idx
                  ? "bg-[#932120] text-white shadow-xs"
                  : "bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200"
              }`}
            >
              {task.task_type === "task1" ? "Task 1 (Biểu đồ)" : "Task 2 (Nghị luận)"}
            </button>
          ))}
        </div>

        <div className="text-xs text-zinc-500 font-medium">
          Số từ: <span className="font-bold text-zinc-900">{currentTask?.word_count || 0}</span> / {currentTask?.min_words} từ tối thiểu
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Task Prompt Box */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 block">
            Đề bài {currentTask?.task_type?.toUpperCase()}
          </span>
          <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed font-medium">
            {currentTask?.task_prompt}
          </p>

          {chartUrl && (
            <div className="mt-3 pt-3 border-t border-zinc-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Biểu đồ đề bài:
                </span>
                <button
                  type="button"
                  onClick={() => setIsChartZoomOpen(true)}
                  aria-label="Phóng to biểu đồ đề bài"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-[11px] font-semibold text-zinc-700 cursor-pointer transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Phóng to
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsChartZoomOpen(true)}
                aria-label="Mở ảnh biểu đồ toàn màn hình"
                className="block w-full cursor-zoom-in rounded-lg focus:outline-none focus:ring-2 focus:ring-[#932120]/30"
              >
                <img
                  src={chartUrl}
                  alt={`Biểu đồ đề bài Writing Task ${currentTask?.task_no ?? (currentTask?.task_type === "task1" ? 1 : 2)}`}
                  className="max-h-56 rounded-lg border border-zinc-200 object-contain mx-auto bg-white"
                />
              </button>
            </div>
          )}
        </div>

        {/* Student Essay Content */}
        <div className="space-y-2 relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-900">Bài làm của thí sinh</span>
            <span className="text-[11px] text-zinc-500">
              Bôi đen văn bản để đánh dấu lỗi mới, hoặc bấm trực tiếp vào vùng tô màu để sửa
            </span>
          </div>

          <div
            ref={essayContentRef}
            onMouseUp={handleMouseUp}
            className="p-5 bg-white border border-zinc-200 rounded-xl font-serif text-sm leading-8 text-zinc-900 select-text whitespace-pre-wrap min-h-[220px] relative focus:outline-none"
          >
            {renderHighlightedEssay(currentTask?.content || "")}

            {toolbarPos && (
              <div
                style={{ top: toolbarPos.top, left: toolbarPos.left }}
                className="absolute z-20 flex items-center gap-1 p-1.5 bg-zinc-900 text-white rounded-xl shadow-lg border border-zinc-800"
              >
                <span className="text-[10px] text-zinc-300 px-1.5 font-mono">Đánh dấu:</span>
                {categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      openCreateFromSelection(cat);
                    }}
                    className="px-2 py-1 text-[11px] font-bold bg-zinc-700 hover:bg-[#932120] rounded-md transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inline Docked Create / Edit Annotation Panel (never clipped!) */}
        {editorOpen && (
          <form
            onSubmit={handleSaveAnnotation}
            className="p-4 bg-zinc-50 border-2 border-[#932120]/30 rounded-2xl space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#932120]" />
                {editingIndex !== null ? "Chỉnh sửa ghi chú lỗi" : "Thêm ghi chú / lỗi mới"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(false);
                  setEditingIndex(null);
                }}
                aria-label="Đóng khung chỉnh sửa"
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categoryOptions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAnnCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    annCategory === cat
                      ? "bg-[#932120] text-white border-[#932120]"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Đoạn gốc / Nhãn vị trí:
                </label>
                <input
                  type="text"
                  value={annOriginal}
                  onChange={(e) => setAnnOriginal(e.target.value)}
                  placeholder="Để trống nếu là nhận xét tổng quát..."
                  className="w-full text-xs p-2.5 bg-white border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Gợi ý sửa (tùy chọn):
                </label>
                <input
                  type="text"
                  value={annCorrected}
                  onChange={(e) => setAnnCorrected(e.target.value)}
                  placeholder="Ví dụ: illustrates the proportion..."
                  className="w-full text-xs p-2.5 bg-white border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Giải thích / Nhận xét chi tiết cho học viên:
              </label>
              <textarea
                value={annExplanation}
                onChange={(e) => setAnnExplanation(e.target.value)}
                rows={2}
                required
                placeholder="Nhập giải thích lỗi hoặc hướng dẫn cải thiện..."
                className="w-full text-xs p-2.5 bg-white border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(false);
                  setEditingIndex(null);
                }}
                className="px-3.5 py-2 text-xs text-zinc-600 hover:bg-zinc-200/60 rounded-xl font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {editingIndex !== null ? "Cập nhật ghi chú" : "Lưu ghi chú"}
              </button>
            </div>
          </form>
        )}

        {/* Existing Annotations List for this Task */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-zinc-900">
              Danh sách lỗi &amp; nhận xét đã đánh dấu ({taskAnnotationsWithIdx.length})
            </h3>
            <button
              type="button"
              onClick={openCreateCustomNote}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-[#932120] hover:text-white text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm nhận xét / lỗi mới
            </button>
          </div>

          {taskAnnotationsWithIdx.length === 0 ? (
            <div className="p-4 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400">
              Chưa có lỗi nào được đánh dấu cho phần thi này. Bôi đen văn bản bên trên hoặc bấm &quot;Thêm nhận xét / lỗi mới&quot;.
            </div>
          ) : (
            <div className="space-y-2">
              {taskAnnotationsWithIdx.map(({ ann, globalIdx }, i) => {
                const styling = CATEGORY_COLORS[ann.category] || CATEGORY_COLORS.GRA;
                return (
                  <div
                    key={`${ann.id || "ann"}-${i}`}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${styling.bg} ${styling.border}`}
                  >
                    <div className="space-y-1 text-xs min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] bg-white ${styling.text} border ${styling.border}`}>
                          {ann.category}
                        </span>
                        {ann.original_text && (
                          <span className="font-semibold text-zinc-600 line-through break-words">
                            {ann.original_text}
                          </span>
                        )}
                        {ann.corrected_text && (
                          <span className="font-bold text-emerald-700 break-words">
                            → {ann.corrected_text}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-700 leading-relaxed">{ann.explanation}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditAnnotation(globalIdx)}
                        aria-label="Sửa ghi chú này"
                        title="Sửa ghi chú"
                        className="text-zinc-500 hover:text-[#932120] p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteByGlobalIdx(globalIdx)}
                        aria-label="Xóa lỗi này"
                        title="Xóa lỗi này"
                        className="text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isChartZoomOpen && chartUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Phóng to biểu đồ đề bài Writing Task 1"
          onClick={() => setIsChartZoomOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full bg-white rounded-2xl p-4 shadow-2xl border border-zinc-200"
          >
            <button
              type="button"
              onClick={() => setIsChartZoomOpen(false)}
              aria-label="Đóng phóng to biểu đồ"
              className="absolute top-3 right-3 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={chartUrl}
              alt="Biểu đồ đề bài Writing Task 1 phóng to"
              className="max-h-[82vh] w-auto mx-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
