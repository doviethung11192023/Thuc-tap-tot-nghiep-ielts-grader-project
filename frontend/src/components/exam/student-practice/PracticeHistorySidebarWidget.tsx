"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronRight, Bookmark, Compass, ArrowRight } from "lucide-react";
import { BlurFadeCard, SpotlightCard, BorderBeam } from "@/components/motion";
import { ChartSkeleton } from "@/components/ui/skeleton";

const PracticeRadarMini = dynamic(
  () => import("./PracticeRadarMini").then((m) => m.PracticeRadarMini),
  { ssr: false, loading: () => <ChartSkeleton heightClass="h-52" label="Đang tải radar điểm..." /> }
);
import { getCachedPracticeHistory } from "@/services/practice-history-cache";
import { getLearningProfileOverview } from "@/services/learning-profile";
import type { SkillScore, SmartRecommendedTest } from "@/types/learning-profile";

const EMPTY_RADAR: SkillScore[] = [
  { skill: "Writing", score: 0 },
  { skill: "Overview", score: 0 },
  { skill: "Listening", score: 0 },
  { skill: "Reading", score: 0 },
  { skill: "Speaking", score: 0 },
];

export function PracticeHistorySidebarWidget() {
  const cached = getCachedPracticeHistory();
  const [overallScore, setOverallScore] = useState<number>(() => cached?.overall_score ?? 0);
  const [radarData, setRadarData] = useState<SkillScore[]>(() => cached?.radar_data || []);
  const [nextTask, setNextTask] = useState<SmartRecommendedTest | null>(null);
  const [priorityReason, setPriorityReason] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(() => !cached);

  useEffect(() => {
    let mounted = true;
    getLearningProfileOverview()
      .then((overview) => {
        if (!mounted || !overview) return;
        setOverallScore(Number(Number(overview.goals?.predicted_band ?? overview.dashboard_stats?.avg_band ?? 0).toFixed(1)));
        setRadarData(overview.radar_data?.length ? overview.radar_data : EMPTY_RADAR);
        setNextTask(overview.roadmap?.recommended_tests?.[0] ?? null);
        setPriorityReason(overview.roadmap?.priority_reason ?? "");
        setLoading(false);
      })
      .catch((e) => {
        console.warn("Lỗi tải radar widget:", e);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <aside className="w-full 2xl:w-80 shrink-0 2xl:sticky 2xl:top-20 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-1 gap-4">
      {nextTask && (
        <BlurFadeCard inView={false} index={0} className="md:col-span-2 2xl:col-span-1">
          <SpotlightCard
            tone="crimson"
            className="bg-gradient-to-br from-red-50/90 via-white to-amber-50/50 rounded-3xl border border-[#932120]/25 p-5 shadow-2xs space-y-3 overflow-hidden"
          >
            <BorderBeam tone="crimson-amber" duration={9} />
            <div className="flex items-center justify-between relative z-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#932120]">
                <Compass className="w-4 h-4" /> Nhiệm vụ Lộ trình Hôm nay
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {nextTask.match_score}% Match
              </span>
            </div>
            <h4 className="text-sm font-bold text-zinc-900 line-clamp-2 relative z-10">{nextTask.title}</h4>
            <p className="text-[11px] text-zinc-600 leading-relaxed relative z-10">{priorityReason || nextTask.reason}</p>
            <Link
              href={nextTask.link}
              className="relative z-10 w-full py-2 px-3 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <span>Luyện ngay ({nextTask.duration_min}p)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </SpotlightCard>
        </BlurFadeCard>
      )}

      <BlurFadeCard index={1}>
        <SpotlightCard
          tone="sky"
          className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-2xs hover:shadow-xs space-y-3 overflow-hidden"
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 relative z-10">
            <h3 className="font-black text-zinc-900 text-sm tracking-tight flex items-center gap-1.5">
              Lịch sử luyện đề
            </h3>
            <Link href="/test-practice/history" className="text-xs font-bold text-[#932120] hover:text-[#7a1a19] flex items-center gap-0.5 group transition-colors">
              <span>Xem chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="relative z-10">
            {loading && radarData.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-3">
                <div className="w-24 h-24 rounded-full border-3 border-zinc-100 border-t-[#932120] animate-spin" />
                <span className="text-xs text-zinc-400 font-medium">Đang cập nhật điểm số...</span>
              </div>
            ) : (
              <PracticeRadarMini radarData={radarData.length > 0 ? radarData : EMPTY_RADAR} overallScore={overallScore > 0 ? overallScore : 0} />
            )}
          </div>
        </SpotlightCard>
      </BlurFadeCard>

      <BlurFadeCard index={2}>
        <SpotlightCard
          tone="amber"
          className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-2xs hover:shadow-xs space-y-3 overflow-hidden"
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 relative z-10">
            <h3 className="font-black text-zinc-900 text-sm tracking-tight flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span>Bộ sưu tập của tôi</span>
            </h3>
          </div>
          <div className="py-4 px-2 text-center space-y-2 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <p className="text-xs text-zinc-500 font-medium leading-relaxed">Bạn chưa có bộ sưu tập đề yêu thích.</p>
            <p className="text-[11px] text-zinc-400">Nhấn biểu tượng lưu trên các bộ đề để ghim vào đây.</p>
          </div>
        </SpotlightCard>
      </BlurFadeCard>
    </aside>
  );
}
