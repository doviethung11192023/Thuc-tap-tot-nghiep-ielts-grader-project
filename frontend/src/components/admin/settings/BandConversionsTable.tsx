import React from "react";
import { Save } from "lucide-react";
import type { BandConversion } from "@/types/exam";

interface BandConversionsTableProps {
  conversions: BandConversion[];
  bandSkill: string;
  onSkillChange: (skill: string) => void;
  onUpdate: (id: string, raw_min: number, raw_max: number, band: number) => void;
}

export function BandConversionsTable({
  conversions,
  bandSkill,
  onSkillChange,
  onUpdate,
}: BandConversionsTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 shadow-xs space-y-5 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs sm:text-sm font-bold text-zinc-700 uppercase tracking-wider">
          Kỹ năng áp dụng bảng quy đổi:
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSkillChange("reading")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              bandSkill === "reading"
                ? "bg-[#932120] text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Reading
          </button>
          <button
            onClick={() => onSkillChange("listening")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              bandSkill === "listening"
                ? "bg-[#932120] text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Listening
          </button>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
          <thead className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Điểm Thô Min (Số câu)</th>
              <th className="py-3 px-4">Điểm Thô Max (Số câu)</th>
              <th className="py-3 px-4">IELTS Band Score</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {conversions.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                <td className="py-3 px-4">
                  <input
                    type="number"
                    defaultValue={item.raw_min}
                    id={`min-${item.id}`}
                    className="w-20 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-[#932120]"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    defaultValue={item.raw_max}
                    id={`max-${item.id}`}
                    className="w-20 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-[#932120]"
                  />
                </td>
                <td className="py-3 px-4 font-bold text-[#932120]">
                  <input
                    type="number"
                    step={0.5}
                    defaultValue={item.band}
                    id={`band-${item.id}`}
                    className="w-20 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs sm:text-sm font-bold text-[#932120] focus:outline-none focus:border-[#932120]"
                  />
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => {
                      const min = parseInt((document.getElementById(`min-${item.id}`) as HTMLInputElement).value);
                      const max = parseInt((document.getElementById(`max-${item.id}`) as HTMLInputElement).value);
                      const band = parseFloat((document.getElementById(`band-${item.id}`) as HTMLInputElement).value);
                      onUpdate(item.id, min, max, band);
                    }}
                    className="p-2 text-zinc-600 hover:text-[#932120] hover:bg-zinc-100 rounded-lg inline-flex items-center transition-colors shadow-2xs"
                    title="Lưu hàng này"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
