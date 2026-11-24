"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Sliders, Award, Settings, RefreshCw, Compass, Bot } from "lucide-react";
import { m } from "motion/react";
import { BlurFadeCard } from "@/components/motion";
import { extractApiErrorMessage } from "@/lib/api-error";
import {
  getBandConversions,
  updateBandConversion,
  getSystemSettings,
  updateSystemSetting,
} from "@/services/admin-content";
import type { BandConversion, SystemSetting } from "@/types/exam";
import { BandConversionsTable } from "@/components/admin/settings/BandConversionsTable";
import { SystemSettingsCards } from "@/components/admin/settings/SystemSettingsCards";
import { AdminExpertGovernanceConfigCard } from "@/components/admin/AdminExpertGovernanceConfigCard";
import { AdminRoadmapConfigTab } from "@/components/admin/AdminRoadmapConfigTab";
import { AdminAiTutorConfigTab } from "@/components/admin/AdminAiTutorConfigTab";
import { apiErrorDetail } from "@/lib/attempt-submission";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"band" | "settings" | "roadmap" | "ai_tutor">("band");
  const [bandSkill, setBandSkill] = useState<"reading" | "listening">("reading");
  const [conversions, setConversions] = useState<BandConversion[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);   // đổi mỗi lần tải để các ô nhập của bảng quy đổi dựng lại theo dữ liệu thật

  const reloadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bandData, settingsData] = await Promise.all([
        getBandConversions(bandSkill),
        getSystemSettings(),
      ]);
      setConversions(bandData);
      setSettings(settingsData);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }, [bandSkill]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBandConversions(bandSkill), getSystemSettings()])
      .then(([bandData, settingsData]) => {
        if (cancelled) return;
        setConversions(bandData);
        setSettings(settingsData);
        setReloadKey((k) => k + 1);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bandSkill]);

  const handleBandUpdate = async (id: string, raw_min: number, raw_max: number, band: number) => {
    try {
      await updateBandConversion(id, {
        skill: bandSkill,
        raw_min,
        raw_max,
        band,
      });
      toast.success("Cập nhật quy đổi điểm thành công!");
    } catch (err: unknown) {
      toast.error(apiErrorDetail(err) || extractApiErrorMessage(err, "Lỗi khi cập nhật quy đổi điểm"));
    }
    // Luôn tải lại: mã dòng là "skill:raw_min", đổi raw_min thì mã đổi theo; lỗi thì đưa ô nhập về giá trị đang lưu
    void reloadAll();
  };

  const handleSettingSave = async (key: string, value: Record<string, unknown>) => {
    setSavingKey(key);
    try {
      await updateSystemSetting(key, value);
      toast.success(`Đã lưu cấu hình ${key} thành công!`);
      void reloadAll();
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Lỗi khi lưu cấu hình"));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <BlurFadeCard inView={false}>
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2.5">
              <Sliders className="w-6 h-6 text-[#932120]" />
              Dữ Liệu Cốt Lõi & Cấu Hình Hệ Thống
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Bảng quy đổi Band Score IELTS Cambridge và các tham số vận hành Cloudflare R2 / AI Grader
            </p>
          </div>
          <button
            onClick={() => void reloadAll()}
            className="p-2.5 border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-600 shadow-2xs transition-colors shrink-0 cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#932120]" : ""}`} />
          </button>
        </div>
      </BlurFadeCard>

      <div className="flex gap-2.5 border-b border-zinc-200 pb-2 overflow-x-auto">
        {(
          [
            { id: "band", label: "Bảng Quy Đổi Band Score", Icon: Award },
            { id: "settings", label: "Tham Số Hệ Thống & R2 Storage", Icon: Settings },
            { id: "roadmap", label: "Lộ Trình & Chẩn Đoán", Icon: Compass },
            { id: "ai_tutor", label: "Trợ lý AI (Tutor)", Icon: Bot },
          ] as const
        ).map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`relative px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? "text-white"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
              }`}
            >
              {isActive && (
                <m.span
                  layoutId="admin-settings-tab-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-[#932120] shadow-xs"
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>

      <BlurFadeCard key={activeTab} inView={false} yOffset={8} duration={0.3}>
        {activeTab === "band" && (
          <BandConversionsTable
            key={`${bandSkill}-${reloadKey}`}
            conversions={conversions}
            bandSkill={bandSkill}
            onSkillChange={(nextSkill) => {
              setLoading(true);
              setBandSkill(nextSkill);
            }}
            onUpdate={handleBandUpdate}
          />
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <AdminExpertGovernanceConfigCard
              settings={settings}
              savingKey={savingKey}
              onSave={handleSettingSave}
            />
            <SystemSettingsCards
              settings={settings}
              savingKey={savingKey}
              onSave={handleSettingSave}
              excludeKeys={["expert_completeness_rules", "expert_cooldown_min_active_pool"]}
            />
          </div>
        )}

        {activeTab === "roadmap" && (
          <AdminRoadmapConfigTab
            settings={settings}
            savingKey={savingKey}
            onSave={handleSettingSave}
          />
        )}

        {activeTab === "ai_tutor" && <AdminAiTutorConfigTab />}
      </BlurFadeCard>
    </div>
  );
}
