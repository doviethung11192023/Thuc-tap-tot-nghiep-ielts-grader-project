// Lucian UX/UI Prompt Workflow & Systems (#176-#200) inspired · Interactive SLA Pipeline Strip
"use client";

import React from "react";
import { CheckCircle2, Clock, UserCheck, Users } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import type { AdminReviewsSummary } from "@/services/admin-reviews";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { BlurFadeCard, SpotlightCard, StaggerGrid, type SpotlightTone } from "@/components/motion";

interface AdminSlaPipelineStripProps {
  summary: AdminReviewsSummary;
  expertsTotal: number;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
}

export function AdminSlaPipelineStrip({
  summary,
  expertsTotal,
  activeStatus,
  onSelectStatus,
}: AdminSlaPipelineStripProps) {
  const prefersReduced = useReducedMotion();
  const stages: Array<{
    id: string;
    label: string;
    count: number;
    icon: React.ReactNode;
    hint: string;
    tone: SpotlightTone;
  }> = [
    {
      id: "waiting",
      label: "Chờ phân bổ",
      count: summary.waiting,
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      hint: "Nhấn để lọc bài chờ gán",
      tone: "amber",
    },
    {
      id: "assigned",
      label: "Đang giao / Chấm",
      count: summary.assigned,
      icon: <UserCheck className="w-4 h-4 text-sky-600" />,
      hint: "Nhấn để lọc bài đang chấm",
      tone: "sky",
    },
    {
      id: "completed",
      label: "Đã hoàn thành",
      count: summary.completed,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      hint: "Nhấn để lọc bài hoàn thành",
      tone: "emerald",
    },
  ];

  return (
    <StaggerGrid
      autoAnimate={false}
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      role="group"
      aria-label="Pipeline điều phối SLA"
    >
      {stages.map((st, idx) => {
        const isActive = activeStatus === st.id;
        return (
          <BlurFadeCard key={st.id} index={idx} inView={false}>
            <SpotlightCard
              tone={st.tone}
              className={`rounded-2xl border shadow-xs overflow-hidden transition-colors ${
                isActive
                  ? "bg-rose-50/70 border-[#932120] ring-2 ring-[#932120]/20"
                  : "bg-[var(--ux-surface)] border-[var(--ux-line)] hover:border-[var(--ux-line-2)] hover:-translate-y-0.5"
              }`}
            >
              <m.button
                type="button"
                whileTap={prefersReduced ? undefined : { scale: 0.985 }}
                onClick={() => onSelectStatus(isActive ? "" : st.id)}
                title={st.hint}
                className="w-full h-full text-left p-5 cursor-pointer relative z-10 block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--ux-ink-2)]">
                    {st.label}
                  </span>
                  {st.icon}
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <p className="text-2xl font-extrabold text-[var(--ux-ink)] tabular-nums">
                    <AnimatedNumber value={st.count} />
                  </p>
                  <span className="text-[11px] font-semibold text-[#932120]">
                    {isActive ? "Đang lọc ×" : "Xem →"}
                  </span>
                </div>
              </m.button>
            </SpotlightCard>
          </BlurFadeCard>
        );
      })}

      <BlurFadeCard index={3} inView={false}>
        <SpotlightCard
          tone="crimson"
          className="bg-[var(--ux-surface)] p-5 rounded-2xl border border-[var(--ux-line)] shadow-xs h-full overflow-hidden"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ux-ink-2)]">
              Expert Sẵn sàng
            </span>
            <Users className="w-4 h-4 text-[#932120]" />
          </div>
          <p className="text-2xl font-extrabold text-[var(--ux-ink)] mt-2 tabular-nums relative z-10">
            <AnimatedNumber value={summary.available_experts} />
            <span className="text-sm font-semibold text-[var(--ux-ink-3)]">/{expertsTotal}</span>
          </p>
        </SpotlightCard>
      </BlurFadeCard>
    </StaggerGrid>
  );
}
