import React from "react";
import { HardDrive, Cpu, Clock, Save, Loader2 } from "lucide-react";
import type { SystemSetting } from "@/types/exam";

interface SystemSettingsCardsProps {
  settings: SystemSetting[];
  savingKey: string | null;
  onSave: (key: string, value: Record<string, any>) => void;
}

export function SystemSettingsCards({
  settings,
  savingKey,
  onSave,
}: SystemSettingsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
      {settings.map((s) => (
        <div
          key={s.key}
          className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-3.5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
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
              disabled={savingKey === s.key}
              onClick={() => {
                const el = document.getElementById(`json-${s.key}`) as HTMLTextAreaElement;
                try {
                  const val = JSON.parse(el.value);
                  onSave(s.key, val);
                } catch (e) {
                  alert("Định dạng JSON không hợp lệ");
                }
              }}
              className="px-4 py-1.5 bg-[#932120] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#7a1a19] flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              {savingKey === s.key ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Lưu
            </button>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500">
            {s.description || "Tham số cấu hình hệ thống"}
          </p>
          <textarea
            id={`json-${s.key}`}
            defaultValue={JSON.stringify(s.value, null, 2)}
            rows={5}
            className="w-full p-3 text-xs sm:text-sm font-mono bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#932120]"
          />
        </div>
      ))}
    </div>
  );
}
