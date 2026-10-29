"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, BookOpen, RotateCcw, Play, Headphones, PenTool, Mic } from "lucide-react";
import type { SingleTestItem } from "@/types/test-practice";

interface ExamCollectionTestRowProps {
  test: SingleTestItem;
  collectionId: string;
}

export function ExamCollectionTestRow({ test, collectionId }: ExamCollectionTestRowProps) {
  const isCompleted = test.skills.some((s) => s.status === "completed");
  const hasDraft = test.skills.some((s) => s.status === "draft");

  return (
    <div className="flex items-center gap-4 group">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
          isCompleted ? "bg-[#932120] text-white shadow-xs" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
        }`}
      >
        {test.orderNumber}
      </div>

      <div
        className={`flex-1 bg-white rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
          isCompleted ? "border-red-200 shadow-xs ring-1 ring-red-100/50" : "border-zinc-200 hover:border-zinc-300 shadow-2xs"
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-red-50 text-[#932120] flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
            )}
            <h3 className="font-bold text-zinc-900 text-base">{test.title}</h3>
            {hasDraft && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                Đang lưu nháp
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {test.skills.map((s) => {
              const score = s.latestBandScore;
              return (
                <span
                  key={s.skill}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${
                    s.status === "completed"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : s.status === "draft"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {score !== undefined && score !== null && (
                    <strong className="font-black text-emerald-800">{score.toFixed(1)}</strong>
                  )}
                  {s.skill === "Listening" && <Headphones className="w-3 h-3" />}
                  {s.skill === "Reading" && <BookOpen className="w-3 h-3" />}
                  {s.skill === "Writing" && <PenTool className="w-3 h-3" />}
                  {s.skill === "Speaking" && <Mic className="w-3 h-3" />}
                  <span>{s.skill}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center">
          <Link
            href={`/test-practice/set/${collectionId}/test/${test.id}`}
            className="h-9 px-5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95 bg-[#932120] hover:bg-[#7a1a19] text-white"
          >
            {isCompleted ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Làm lại</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Làm bài</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
