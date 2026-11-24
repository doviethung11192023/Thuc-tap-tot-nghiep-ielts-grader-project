"use client";

import React from "react";
import { CheckCircle2, AlertCircle, ClipboardCheck, ShieldAlert } from "lucide-react";
import type { CriterionScoreDetail, ExpertCompletenessRules, WorkspaceAnnotation } from "@/types";

const AI_ERROR_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "channels_disagree", regex: /channels_disagree/i },
  { label: "word confidence score", regex: /word confidence score/i },
  { label: "traceback", regex: /traceback/i },
  { label: "internal server error", regex: /internal server error/i },
  { label: "none", regex: /\bnone\b/i },
  { label: "null", regex: /\bnull\b/i },
  { label: "todo", regex: /\btodo\b/i },
  { label: "exception:", regex: /exception:/i },
];

export function findAiErrorStrings(text: string): string[] {
  if (!text) return [];
  return AI_ERROR_PATTERNS.filter((p) => p.regex.test(text)).map((p) => p.label);
}

export function isGibberishInput(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;
  if (/(.)\1{7,}/.test(clean)) return true;
  const alnum = clean.toLowerCase().replace(/[^a-z0-9\u00c0-\u1ef9]/g, "");
  return alnum.length >= 15 && new Set(alnum).size < 4;
}

interface Props {
  skill: "writing" | "speaking";
  overallBand: number;
  aiOverallBand?: number | null;
  changeReason?: string;
  criteriaScores: CriterionScoreDetail[];
  annotations: WorkspaceAnnotation[];
  generalFeedback: string;
  onChangeFeedback: (val: string) => void;
  rules?: ExpertCompletenessRules;
}

export function isWorkspaceReviewComplete(
  skill: "writing" | "speaking",
  criteriaScores: CriterionScoreDetail[],
  annotations: WorkspaceAnnotation[],
  generalFeedback: string,
  rules?: ExpertCompletenessRules,
  overallBand?: number,
  aiOverallBand?: number | null,
  changeReason?: string,
): boolean {
  const minCrit = rules?.min_criteria_count ?? 4;
  const minCC = rules?.min_criterion_comment_chars ?? 20;
  const minFB = rules?.min_overall_feedback_chars ?? 50;
  const minWAnn = rules?.min_writing_annotations ?? 1;
  const exemptBand = rules?.exempt_annotation_band ?? 8.5;
  const minReason = rules?.min_change_reason_chars ?? 15;

  const fbTrim = generalFeedback.trim();
  const critOk =
    criteriaScores.length >= minCrit &&
    criteriaScores.every((c) => (c.comment || "").trim().length >= minCC);
  const annExempt = skill === "writing" && typeof overallBand === "number" && overallBand >= exemptBand;
  const annOk =
    skill === "writing"
      ? annExempt || annotations.length >= minWAnn
      : annotations.length >= 1 || fbTrim.length >= Math.max(minFB, 100);

  const allTexts = [fbTrim, ...criteriaScores.map((c) => c.comment || "")];
  const qualityOk = allTexts.every((t) => findAiErrorStrings(t).length === 0 && !isGibberishInput(t));

  const dev =
    aiOverallBand !== undefined && aiOverallBand !== null && typeof overallBand === "number"
      ? Math.abs(overallBand - Number(aiOverallBand))
      : 0;
  const reasonOk = dev < 1.0 || (changeReason || "").trim().length >= minReason;

  return fbTrim.length >= minFB && critOk && annOk && qualityOk && reasonOk;
}

export function ExpertCompletenessChecklist({
  skill,
  overallBand,
  aiOverallBand,
  changeReason = "",
  criteriaScores,
  annotations,
  generalFeedback,
  onChangeFeedback,
  rules,
}: Props) {
  const minCrit = rules?.min_criteria_count ?? 4;
  const minCC = rules?.min_criterion_comment_chars ?? 20;
  const minFB = rules?.min_overall_feedback_chars ?? 50;
  const minWAnn = rules?.min_writing_annotations ?? 1;
  const exemptBand = rules?.exempt_annotation_band ?? 8.5;
  const minReason = rules?.min_change_reason_chars ?? 15;

  const fbTrim = generalFeedback.trim();
  const validCriteria = criteriaScores.filter((c) => (c.comment || "").trim().length >= minCC).length;
  const annExempt = skill === "writing" && overallBand >= exemptBand;

  const badMatches = Array.from(
    new Set([generalFeedback, ...criteriaScores.map((c) => c.comment || "")].flatMap(findAiErrorStrings)),
  );
  const hasGibberish = [generalFeedback, ...criteriaScores.map((c) => c.comment || "")].some(isGibberishInput);
  const qualityOk = badMatches.length === 0 && !hasGibberish;

  const deviation =
    aiOverallBand !== undefined && aiOverallBand !== null ? Math.abs(overallBand - Number(aiOverallBand)) : 0;
  const needsReason = deviation >= 1.0;

  const checks = [
    {
      label: `Đủ ${minCrit} tiêu chí & nhận xét >= ${minCC} ký tự`,
      done: `${validCriteria}/${Math.max(criteriaScores.length, minCrit)}`,
      ok: criteriaScores.length >= minCrit && validCriteria === criteriaScores.length,
    },
    {
      label: `Nhận xét tổng quan >= ${minFB} ký tự`,
      done: `${fbTrim.length}/${minFB}`,
      ok: fbTrim.length >= minFB,
    },
    {
      label:
        skill === "writing"
          ? annExempt
            ? `Chú thích Writing (Miễn do Band >= ${exemptBand})`
            : `Tối thiểu ${minWAnn} chú thích lỗi (annotations)`
          : "Ghi chú âm thanh hoặc nhận xét >= 100 ký tự",
      done:
        skill === "writing"
          ? annExempt
            ? "Miễn"
            : `${annotations.length}/${minWAnn}`
          : `${annotations.length} note`,
      ok:
        skill === "writing"
          ? annExempt || annotations.length >= minWAnn
          : annotations.length >= 1 || fbTrim.length >= Math.max(minFB, 100),
    },
    {
      label: "Không chứa lỗi AI thô (null, traceback...) hay ký tự lặp",
      done: qualityOk ? "Hợp lệ" : badMatches[0] || "Ký tự lặp",
      ok: qualityOk,
    },
    ...(needsReason
      ? [
          {
            label: `Lý do điều chỉnh lệch >= 1.0 band (>= ${minReason} ký tự)`,
            done: `${changeReason.trim().length}/${minReason}`,
            ok: changeReason.trim().length >= minReason,
          },
        ]
      : []),
  ];

  const allReady = checks.every((c) => c.ok);
  const fbError = findAiErrorStrings(generalFeedback).length > 0 || isGibberishInput(generalFeedback);

  return (
    <div className="mt-4 bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 shadow-xs">
      <div>
        <label htmlFor="expert-overall-feedback" className="block text-xs font-bold text-zinc-800 mb-1.5">
          Nhận xét tổng quan gửi Học viên (Tổng kết điểm mạnh &amp; hướng cải thiện):
        </label>
        <textarea
          id="expert-overall-feedback"
          rows={3}
          value={generalFeedback}
          onChange={(e) => onChangeFeedback(e.target.value)}
          placeholder={`Nhập nhận xét tổng quan tối thiểu ${minFB} ký tự...`}
          className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none focus:ring-1 leading-relaxed ${
            fbError
              ? "border-rose-400 bg-rose-50/40 focus:ring-rose-500"
              : "border-zinc-300 focus:ring-[#932120]"
          }`}
        />
        {badMatches.length > 0 && (
          <p className="mt-1.5 text-[11px] font-semibold text-rose-700 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            Phát hiện chuỗi kỹ thuật cần xóa: <span className="font-mono underline">{badMatches.join(", ")}</span>
          </p>
        )}
      </div>

      <div className={`p-3 rounded-xl border ${allReady ? "bg-emerald-50/70 border-emerald-200" : "bg-amber-50/70 border-amber-200"} space-y-2`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-[#932120]" />
            Cổng Kiểm Tra Độ Đầy Đủ (Pillar 1)
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${allReady ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}>
            {allReady ? "Đủ điều kiện nộp" : "Chưa đủ điều kiện"}
          </span>
        </div>
        <div className="space-y-1.5">
          {checks.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-[11px] gap-2">
              <span className={`flex items-center gap-1.5 ${item.ok ? "text-emerald-800 font-medium" : "text-rose-800 font-semibold"}`}>
                {item.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                {item.label}
              </span>
              <span className="font-mono tabular-nums font-bold text-zinc-700 shrink-0">{item.done}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
