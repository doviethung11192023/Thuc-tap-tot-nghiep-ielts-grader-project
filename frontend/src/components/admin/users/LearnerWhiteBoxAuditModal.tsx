"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2, ShieldCheck, Zap, Calculator, Cpu, CalendarRange, FileSpreadsheet } from "lucide-react";
import { getAdminLearnerWhiteBoxAudit } from "@/services/users";
import { Br12ProofTab, MonthlyAndLedgerProofTab, UtilityAndEwmaProofTab } from "@/components/admin/users/LearnerAuditProofTabs";

interface LearnerWhiteBoxAuditModalProps {
  userId: string | null;
  onClose: () => void;
}

export function LearnerWhiteBoxAuditModal({ userId, onClose }: LearnerWhiteBoxAuditModalProps) {
  const [tab, setTab] = useState<"br12" | "algo" | "monthly" | "ledger">("br12");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-learner-audit", userId],
    queryFn: () => getAdminLearnerWhiteBoxAudit(userId!),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!userId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userId, onClose]);

  if (!userId) return null;

  const tabs = [
    { id: "br12", label: "1. Công thức Band BR-12", icon: Calculator },
    { id: "algo", label: "2. Chấm điểm MatchScore % & EWMA", icon: Cpu },
    { id: "monthly", label: "3. Minh chứng Tháng & Giờ học", icon: CalendarRange },
    { id: "ledger", label: "4. Sổ cái Bài thi gốc", icon: FileSpreadsheet },
  ] as const;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hồ Sơ Minh Chứng Trắng White-Box Audit"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-5 backdrop-blur-xs"
    >
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900">
                Hồ Sơ Minh Chứng Trắng (White-Box Audit): {data?.learner?.full_name || "Đang tải..."}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{data?.learner?.email || userId}</span>
                {data?.elapsed_ms !== undefined && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    <Zap className="w-3 h-3" /> Tải trong {data.elapsed_ms}ms
                  </span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng hồ sơ minh chứng" className="p-2 rounded-xl hover:bg-zinc-200 text-zinc-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-2.5 bg-white border-b border-zinc-200 flex gap-2 overflow-x-auto shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  tab === t.id ? "bg-[#932120] text-white shadow-2xs" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading || !data ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
              <p className="text-xs text-zinc-500 font-semibold">Đang trích xuất bằng chứng số liệu từ Database...</p>
            </div>
          ) : (
            <>
              {tab === "br12" && <Br12ProofTab br12={data.audit_sections.br12_band_proof} />}
              {tab === "algo" && <UtilityAndEwmaProofTab sections={data.audit_sections} />}
              {tab === "monthly" && <MonthlyAndLedgerProofTab sections={data.audit_sections} mode="monthly" />}
              {tab === "ledger" && <MonthlyAndLedgerProofTab sections={data.audit_sections} mode="ledger" />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
