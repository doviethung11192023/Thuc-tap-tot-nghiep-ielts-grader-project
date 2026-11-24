"use client";

import React from "react";
import { toast } from "sonner";
import { HardDrive, Cpu, Clock, Save, Loader2 } from "lucide-react";
import { BlurFadeCard, SpotlightCard, StaggerGrid } from "@/components/motion";
import type { SystemSetting } from "@/types/exam";

interface SystemSettingsCardsProps {
  settings: SystemSetting[];
  savingKey: string | null;
  onSave: (key: string, value: Record<string, unknown>) => void;
  excludeKeys?: string[];
}

export function SystemSettingsCards({
  settings,
  savingKey,
  onSave,
  excludeKeys = [],
}: SystemSettingsCardsProps) {
  const visibleSettings = settings.filter((s) => !excludeKeys.includes(s.key));
  return (
    <StaggerGrid autoAnimate={false} className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
      {visibleSettings.map((s, idx) => (
        <BlurFadeCard key={s.key} index={idx} inView={false}>
          <SpotlightCard
            tone="crimson"
            className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-3.5 h-full overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 relative z-10">
              <div className="flex items-center gap-2.5">
                {s.key.includes("upload") ? (
                  <HardDrive className="w-5 h-5 text-[#932120]" />
                ) : s.key.includes("ai") ? (
                  <Cpu className="w-5 h-5 text-[#932120]" />
                ) : (
                  <Clock className="w-5 h-5 text-[#932120]" />
                )}
                <span className="font-bold text-xs sm:text-sm text-zinc-900 uppercase tracking-wide">
                  {s.key}
                </span>
              </div>
              <button
                type="button"
                disabled={savingKey === s.key}
                onClick={() => {
                  const el = document.getElementById(`json-${s.key}`) as HTMLTextAreaElement;
                  try {
                    const val = JSON.parse(el.value);
                    onSave(s.key, val);
                  } catch {
                    toast.error("Định dạng JSON không hợp lệ");
                  }
                }}
                className="px-4 py-1.5 bg-[#932120] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#7a1a19] flex items-center gap-1.5 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
              >
                {savingKey === s.key ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Lưu
              </button>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 relative z-10">
              {s.description || "Tham số cấu hình hệ thống"}
            </p>
            <textarea
              id={`json-${s.key}`}
              defaultValue={JSON.stringify(s.value, null, 2)}
              rows={5}
              className="relative z-10 w-full p-3 text-xs sm:text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#932120]"
            />
          </SpotlightCard>
        </BlurFadeCard>
      ))}
    </StaggerGrid>
  );
}
