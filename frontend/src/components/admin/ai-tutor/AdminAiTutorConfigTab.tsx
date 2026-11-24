"use client";

import React, { useEffect, useState } from "react";
import { Bot, Save, RotateCcw, Trash2, Activity, ShieldAlert, Zap, MessageSquare, CheckCircle2 } from "lucide-react";
import {
  flushAdminTutorCache,
  getAdminTutorOverview,
  saveAdminTutorConfig,
  type AdminTutorConfig,
  type AdminTutorOverview,
} from "@/services/admin-tutor";
import { AdminAiTutorProviderSection } from "@/components/admin/ai-tutor/AdminAiTutorProviderSection";
import { AdminAiTutorPedagogySection } from "@/components/admin/ai-tutor/AdminAiTutorPedagogySection";
import { AdminAiTutorTelemetrySection } from "@/components/admin/ai-tutor/AdminAiTutorTelemetrySection";

export function AdminAiTutorConfigTab() {
  const [overview, setOverview] = useState<AdminTutorOverview | null>(null);
  const [draft, setDraft] = useState<AdminTutorConfig | null>(null);
  const [subTab, setSubTab] = useState<"ops" | "models" | "branding" | "telemetry">("ops");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await getAdminTutorOverview();
      setOverview(data);
      setDraft(data.config);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getAdminTutorOverview()
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setDraft(data.config);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveAdminTutorConfig(draft);
      await loadOverview();
      showToast("Đã lưu toàn bộ cấu hình Trợ lý AI thành công (áp dụng ngay lập tức)!");
    } catch {
      showToast("Lỗi khi lưu cấu hình — vui lòng kiểm tra Base URL hoặc giá trị nhập.");
    } finally {
      setSaving(false);
    }
  };

  const handleFlushCache = async () => {
    const res = await flushAdminTutorCache();
    showToast(`Đã xóa ${res.removed} mục cache gợi ý nhanh trên Redis.`);
    await loadOverview();
  };

  if (loading || !overview || !draft) {
    return <div className="p-8 text-center text-sm font-semibold text-zinc-500">Đang tải trung tâm điều khiển Trợ lý AI...</div>;
  }

  const st = overview.stats;
  const kpis = [
    { label: "Lượt hỏi hôm nay", value: st.turns_today, sub: `Ngày ${st.date}`, icon: MessageSquare, tone: "text-sky-700 bg-sky-50" },
    { label: "Cache Hit Rate", value: `${st.cache_hit_rate}%`, sub: `${st.cache_hits_today} lượt tiết kiệm token`, icon: Zap, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Mở khóa đáp án", value: st.unlocks_today, sub: "Có xác nhận 1 bước", icon: Activity, tone: "text-amber-700 bg-amber-50" },
    { label: "Lỗi / Failover", value: `${st.errors_today} / ${st.failovers_today}`, sub: overview.ai_engine_reachable ? "AI Engine :8001 Online" : "AI Engine Offline", icon: ShieldAlert, tone: st.errors_today > 0 ? "text-rose-700 bg-rose-50" : "text-zinc-700 bg-zinc-100" },
  ];

  return (
    <div className="space-y-5">
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-zinc-200 bg-white p-4 flex items-center gap-3.5 shadow-2xs">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.tone}`}>
              <k.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-zinc-500">{k.label}</p>
              <p className="text-xl font-black text-zinc-900">{k.value}</p>
              <p className="text-[10px] font-semibold text-zinc-400 truncate">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200">
        <div className="flex flex-wrap gap-2">
          {([
            ["ops", "1. Vận hành & Sư phạm"],
            ["models", "2. Mô hình & API Key"],
            ["branding", "3. Thương hiệu, Mascot & Chips"],
            ["telemetry", "4. Giám sát Token & Telemetry"],
          ] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setSubTab(key)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${subTab === key ? "bg-[#932120] text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleFlushCache} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Xóa Cache
          </button>
          <button type="button" onClick={() => setDraft(overview.defaults)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" /> Mặc định
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#932120] text-white text-xs font-extrabold hover:bg-[#7a1a19] disabled:opacity-50 cursor-pointer">
            <Save className="w-3.5 h-3.5" /> {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </div>

      {subTab === "telemetry" ? (
        <AdminAiTutorTelemetrySection stats={st} onRefresh={loadOverview} />
      ) : subTab === "models" ? (
        <AdminAiTutorProviderSection
          config={draft}
          providers={overview.providers}
          onChange={(patch) => setDraft((p) => (p ? { ...p, ...patch } : p))}
          onSecretsUpdated={loadOverview}
        />
      ) : (
        <AdminAiTutorPedagogySection
          view={subTab}
          config={draft}
          onChange={(patch) => setDraft((p) => (p ? { ...p, ...patch } : p))}
        />
      )}

      {st.top_tests.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h4 className="text-xs font-black text-zinc-800 flex items-center gap-1.5 mb-2.5">
            <Bot className="w-4 h-4 text-[#932120]" /> Top đề thi học viên hỏi AI nhiều nhất hôm nay
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {st.top_tests.map((t) => (
              <div key={t.test_id} className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
                <p className="text-xs font-bold text-zinc-800 truncate">{t.title}</p>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase">{t.skill} · {t.count} lượt</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
