// Lucian UX/UI Prompt #386 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#386
"use client";

import React, { useState } from "react";
import { Medal, Lock, Flame, Target, TrendingUp, RotateCw, CheckCircle2 } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { BlurFadeCard, SpotlightCard, BorderBeam } from "@/components/motion";
import type { LearnerBadgesData, LearnerBadgeItem } from "@/types/learning-profile";

const TIER_STYLE: Record<string, { label: string; card: string; pill: string; bar: string; backAccent: string }> = {
  bronze: {
    label: "Đồng",
    card: "bg-orange-50/75 border-orange-300",
    pill: "bg-orange-100 text-orange-800 border-orange-300",
    bar: "bg-orange-600",
    backAccent: "text-orange-300",
  },
  silver: {
    label: "Bạc",
    card: "bg-slate-50 border-slate-300",
    pill: "bg-slate-200 text-slate-800 border-slate-300",
    bar: "bg-slate-600",
    backAccent: "text-slate-200",
  },
  gold: {
    label: "Vàng",
    card: "bg-amber-50/85 border-amber-300",
    pill: "bg-amber-100 text-amber-900 border-amber-300",
    bar: "bg-amber-500",
    backAccent: "text-amber-300",
  },
};

const PILLARS: Array<{ key: string; title: string; icon: React.ReactNode }> = [
  { key: "streak", title: "Kiên trì (Streak)", icon: <Flame className="w-4 h-4 text-[#932120]" /> },
  { key: "mastery", title: "Chinh phục Kỹ năng", icon: <Target className="w-4 h-4 text-[#932120]" /> },
  { key: "breakthrough", title: "Bứt phá Band", icon: <TrendingUp className="w-4 h-4 text-[#932120]" /> },
];

export function LearnerBadgesShowcase({ badges }: { badges?: LearnerBadgesData }) {
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const prefersReduced = useReducedMotion();

  if (!badges) return null;
  const { summary, badges: items } = badges;

  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <BlurFadeCard>
      <SpotlightCard tone="amber" className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
              <Medal className="w-5 h-5 text-[#932120]" />
              Huy hiệu Thành tích 3 Tầng ({summary.unlocked_count}/{summary.total_count})
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Mở khóa theo 3 cấp Đồng · Bạc · Vàng — chạm huy hiệu đã đạt để lật xem chi tiết
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Vàng: {summary.gold_count}</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300">Bạc: {summary.silver_count}</span>
            <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200">Đồng: {summary.bronze_count}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
          {PILLARS.map((pillar, pillarIdx) => {
            const pItems = items.filter((b: LearnerBadgeItem) => b.pillar === pillar.key);
            return (
              <BlurFadeCard key={pillar.key} index={pillarIdx}>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/55 p-3.5 space-y-2.5 h-full">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-zinc-800">
                    {pillar.icon}
                    <span>{pillar.title}</span>
                  </div>

                  {pItems.map((b) => {
                    const st = TIER_STYLE[b.tier] || TIER_STYLE.bronze;
                    const isFlipped = Boolean(flippedIds[b.id]);

                    if (!b.unlocked) {
                      return (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl border bg-white border-zinc-200 opacity-85 min-h-[112px] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                                <Lock className="w-3 h-3 text-zinc-400 shrink-0" />
                                {b.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.pill}`}>
                                {st.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-600 leading-snug line-clamp-2">{b.description}</p>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                              <m.div
                                className={`${st.bar} h-full rounded-full origin-left`}
                                initial={prefersReduced ? false : { width: 0 }}
                                whileInView={{ width: `${b.progress_pct}%` }}
                                viewport={{ once: true, amount: 0.2 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                style={prefersReduced ? { width: `${b.progress_pct}%` } : undefined}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-zinc-700 tabular-nums whitespace-nowrap">
                              {b.current_value}/{b.target_value} · {b.progress_pct}%
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleFlip(b.id)}
                        aria-pressed={isFlipped}
                        aria-label={`${b.title} (${st.label}) — nhấn để lật xem chi tiết`}
                        className="w-full text-left badge-3d-scene cursor-pointer rounded-xl block focus-visible:outline-2 focus-visible:outline-[#932120]"
                      >
                        <div className={`badge-3d-inner min-h-[112px] ${isFlipped ? "is-flipped" : ""}`}>
                          {/* Front face */}
                          <div className={`badge-3d-face relative p-3 rounded-xl border min-h-[112px] flex flex-col justify-between overflow-hidden shadow-2xs ${st.card}`}>
                            {b.tier === "gold" && <BorderBeam tone="gold" duration={9} />}
                            {!prefersReduced && <span aria-hidden="true" className="badge-sheen-overlay" />}

                            <div className="relative z-10">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  {b.title}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.pill}`}>
                                  {st.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-700 leading-snug line-clamp-2">{b.description}</p>
                            </div>

                            <div className="flex items-center gap-2 pt-2 relative z-10">
                              <div className="flex-1 h-1.5 bg-zinc-200/80 rounded-full overflow-hidden">
                                <div className={`${st.bar} h-full rounded-full`} style={{ width: `${b.progress_pct}%` }} />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-zinc-800 inline-flex items-center gap-1 whitespace-nowrap">
                                <RotateCw className="w-2.5 h-2.5 text-zinc-500" />
                                {b.current_value}/{b.target_value}
                              </span>
                            </div>
                          </div>

                          {/* Back face */}
                          <div className="badge-3d-back p-3 rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-50 flex flex-col justify-between shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-black uppercase tracking-wider ${st.backAccent}`}>
                                Huy hiệu {st.label}
                              </span>
                              <span className="text-[10px] text-emerald-400 font-bold">Đã mở khóa</span>
                            </div>
                            <p className="text-[11px] text-zinc-200 leading-snug line-clamp-2">
                              {b.description}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                              <span>{pillar.title}</span>
                              <span className="inline-flex items-center gap-1 text-zinc-300">
                                <RotateCw className="w-2.5 h-2.5" /> Lật lại
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </BlurFadeCard>
            );
          })}
        </div>
      </SpotlightCard>
    </BlurFadeCard>
  );
}
