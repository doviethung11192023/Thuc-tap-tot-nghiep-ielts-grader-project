"use client";

import React from "react";
import Link from "next/link";
import { Compass, Sparkles, ArrowRight, CheckCircle2, Clock, Award, ShieldAlert } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { BlurFadeCard, SpotlightCard, StaggerGrid } from "@/components/motion";
import type { PersonalizedRoadmap, StudyMilestone } from "@/types/learning-profile";

interface PersonalizedRoadmapSectionProps {
  roadmap?: PersonalizedRoadmap;
  milestones?: StudyMilestone[];
}

const PHASE_BADGE: Record<string, { label: string; cls: string }> = {
  foundation: { label: "Giai đoạn 1: Xây nền & Sửa điểm nghẽn", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  acceleration: { label: "Giai đoạn 2: Tăng tốc & Ghép đề", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  sprint: { label: "Giai đoạn 3: Nước rút Phòng thi Mock", cls: "bg-red-50 text-[#932120] border-red-200" },
};

export function PersonalizedRoadmapSection({ roadmap, milestones = [] }: PersonalizedRoadmapSectionProps) {
  const prefersReduced = useReducedMotion();
  if (!roadmap) return null;
  const phase = PHASE_BADGE[roadmap.exam_phase] || PHASE_BADGE.acceleration;

  return (
    <BlurFadeCard as="section">
      <section className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#932120]/10 text-[#932120] flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
                Lộ Trình Luyện Đề Cá Nhân Hóa (Adaptive BR-17)
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">{roadmap.priority_reason}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border self-start sm:self-center ${phase.cls}`}>
            <Sparkles className="w-3.5 h-3.5" /> {phase.label}
          </span>
        </div>

        {milestones.length > 0 && (
          <StaggerGrid autoAnimate={false} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {milestones.map((item, idx) => (
              <BlurFadeCard key={item.id} index={idx}>
                <SpotlightCard
                  tone={item.progress_percent >= 100 ? "emerald" : item.is_active ? "crimson" : "amber"}
                  className={`rounded-2xl p-3.5 border h-full overflow-hidden ${
                    item.progress_percent >= 100
                      ? "bg-emerald-50/60 border-emerald-200"
                      : item.is_active
                        ? "bg-red-50/40 border-[#932120]/40 shadow-2xs"
                        : "bg-zinc-50 border-zinc-200/70"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-2 relative z-10">
                    <span className="text-zinc-900">{item.title}</span>
                    {item.progress_percent >= 100 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <span className={item.is_active ? "text-[#932120]" : "text-zinc-500"}>{item.progress_percent}%</span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden relative z-10">
                    <m.div
                      initial={prefersReduced ? false : { width: 0 }}
                      whileInView={{ width: `${Math.max(4, item.progress_percent)}%` }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        item.progress_percent >= 100 ? "bg-emerald-500" : item.is_active ? "bg-[#932120]" : "bg-zinc-400"
                      }`}
                      style={prefersReduced ? { width: `${Math.max(4, item.progress_percent)}%` } : undefined}
                    />
                  </div>
                </SpotlightCard>
              </BlurFadeCard>
            ))}
          </StaggerGrid>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-zinc-50/90 border border-zinc-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#932120] text-white">
                Ưu tiên: {roadmap.priority_skill.toUpperCase()}
              </span>
              <span className="text-[11px] font-semibold text-zinc-500">{roadmap.strategy.focus_label}</span>
            </div>

            <h3 className="text-sm font-black text-zinc-900">{roadmap.strategy.title}</h3>
            <p className="text-xs text-zinc-700 bg-white border border-zinc-200/80 rounded-xl p-2.5 leading-relaxed">
              <strong className="text-[#932120]">Bằng chứng chẩn đoán:</strong> {roadmap.evidence_summary}
            </p>

            <ul className="space-y-2">
              {roadmap.strategy.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            {roadmap.expert_review_tip && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 font-medium">
                <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Mẹo bứt phá: Sau khi làm đề {roadmap.priority_skill.toUpperCase()}, hãy dùng suất <strong>Chấm Chuyên Gia (Expert Review)</strong> để nhận sửa lỗi chi tiết.</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900">Bộ 3 Bài Luyện Đề Đề Xuất (EWMA + ZPD Utility)</h3>
              <span className="text-[11px] text-zinc-500 font-semibold">Loại trừ đề đã làm {roadmap.recent_exclude_days ?? 14} ngày gần đây</span>
            </div>

            {roadmap.recommended_tests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 space-y-2">
                <ShieldAlert className="w-6 h-6 text-zinc-400 mx-auto" />
                <p>Chưa có đề {roadmap.priority_skill} được xuất bản. Bạn có thể chọn kỹ năng khác trong Thư viện đề.</p>
              </div>
            ) : (
              <StaggerGrid autoAnimate={false} className="space-y-3">
                {roadmap.recommended_tests.map((test, idx) => (
                  <BlurFadeCard key={test.id} index={idx}>
                    <SpotlightCard
                      tone="crimson"
                      className="rounded-2xl border border-zinc-200 bg-white hover:border-[#932120]/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs overflow-hidden"
                    >
                      <div className="space-y-1.5 min-w-0 relative z-10">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {test.match_score}% Phù hợp
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                            {test.slot_label}
                          </span>
                          <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {test.duration_min}p
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-900 truncate">{test.title}</h4>
                        <p className="text-xs text-zinc-600">{test.reason}</p>
                      </div>

                      <Link
                        href={test.link}
                        className="relative z-10 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold whitespace-nowrap transition-all active:scale-[0.98] shrink-0"
                      >
                        <span>Vào luyện ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </SpotlightCard>
                  </BlurFadeCard>
                ))}
              </StaggerGrid>
            )}
          </div>
        </div>
      </section>
    </BlurFadeCard>
  );
}
