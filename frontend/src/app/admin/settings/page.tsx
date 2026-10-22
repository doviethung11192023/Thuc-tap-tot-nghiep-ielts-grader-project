"use client";

import React, { useState, useEffect } from "react";
import { Sliders, Award, Settings, RefreshCw } from "lucide-react";
import {
  getBandConversions,
  updateBandConversion,
  getSystemSettings,
  updateSystemSetting,
} from "@/services/admin-content";
import type { BandConversion, SystemSetting } from "@/types/exam";
import { BandConversionsTable } from "@/components/admin/BandConversionsTable";
import { SystemSettingsCards } from "@/components/admin/SystemSettingsCards";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"band" | "settings">("band");
  const [bandSkill, setBandSkill] = useState<string>("reading");
  const [conversions, setConversions] = useState<BandConversion[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bandData, settingsData] = await Promise.all([
        getBandConversions(bandSkill),
        getSystemSettings(),
      ]);
      setConversions(bandData);
      setSettings(settingsData);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [bandSkill]);

  const handleBandUpdate = async (id: string, raw_min: number, raw_max: number, band: number) => {
    try {
      await updateBandConversion(id, {
        skill: bandSkill as any,
        raw_min,
        raw_max,
        band,
      });
      alert("Cập nhật quy đổi điểm thành công!");
    } catch (err) {
      alert("Lỗi khi cập nhật quy đổi điểm");
    }
  };

  const handleSettingSave = async (key: string, value: Record<string, any>) => {
    setSavingKey(key);
    try {
      await updateSystemSetting(key, value);
      alert(`Đã lưu cấu hình ${key} thành công!`);
      loadData();
    } catch (err) {
      alert("Lỗi khi lưu cấu hình");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-[#932120]" />
            Dữ Liệu Cốt Lõi & Cấu Hình Hệ Thống (UC-A05)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Bảng quy đổi Band Score IELTS Cambridge và các tham số vận hành Cloudflare R2 / AI Grader
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-600 shadow-2xs transition-colors shrink-0"
          title="Tải lại dữ liệu"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#932120]" : ""}`} />
        </button>
      </div>

      <div className="flex gap-2.5 border-b border-zinc-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("band")}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "band"
              ? "bg-[#932120] text-white shadow-xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <Award className="w-4 h-4" /> Bảng Quy Đổi Band Score
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-[#932120] text-white shadow-xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <Settings className="w-4 h-4" /> Tham Số Hệ Thống & R2 Storage
        </button>
      </div>

      {activeTab === "band" && (
        <BandConversionsTable
          conversions={conversions}
          bandSkill={bandSkill}
          onSkillChange={setBandSkill}
          onUpdate={handleBandUpdate}
        />
      )}

      {activeTab === "settings" && (
        <SystemSettingsCards
          settings={settings}
          savingKey={savingKey}
          onSave={handleSettingSave}
        />
      )}
    </div>
  );
}
