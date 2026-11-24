"use client";

import React, { useState } from "react";
import { KeyRound, Zap, CheckCircle2, XCircle, Loader2, Trash2, Save } from "lucide-react";
import {
  pingAdminTutorModel,
  updateAdminTutorSecrets,
  type AdminTutorConfig,
  type AdminTutorPingResult,
  type AdminTutorProviderInfo,
} from "@/services/admin-tutor";

const PRESETS: Record<string, { label: string; base_url: string; model: string }> = {
  qwen: { label: "Alibaba Qwen (DashScope)", base_url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", model: "qwen-flash" },
  groq: { label: "Groq Cloud (Llama 3.3)", base_url: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  gemini: { label: "Google Gemini (OpenAI API)", base_url: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.5-flash" },
  openai_compatible: { label: "OpenAI / OpenRouter / Ollama", base_url: "https://api.openai.com/v1", model: "gpt-4o-mini" },
};

interface Props {
  config: AdminTutorConfig;
  providers: Record<string, AdminTutorProviderInfo>;
  onChange: (patch: Partial<AdminTutorConfig>) => void;
  onSecretsUpdated: () => Promise<void>;
}

export function AdminAiTutorProviderSection({ config, providers, onChange, onSecretsUpdated }: Props) {
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pinging, setPinging] = useState<"primary" | "failover" | null>(null);
  const [pingResult, setPingResult] = useState<Record<string, AdminTutorPingResult>>({});

  const handlePing = async (slot: "primary" | "failover") => {
    setPinging(slot);
    try {
      const prov = slot === "primary" ? config.primary_provider : config.failover_provider;
      const res = await pingAdminTutorModel({
        provider: prov,
        model: slot === "primary" ? config.primary_model : config.failover_model,
        base_url: slot === "primary" ? config.primary_base_url : config.failover_base_url,
        api_key: keyInputs[prov] || undefined,
        enable_thinking: slot === "primary" ? config.enable_thinking : false,
      });
      setPingResult((p) => ({ ...p, [slot]: res }));
    } finally {
      setPinging(null);
    }
  };

  const handleSaveSecret = async (prov: string, clear = false) => {
    setSavingKey(prov);
    try {
      await updateAdminTutorSecrets({ [prov]: clear ? null : keyInputs[prov] || "" });
      setKeyInputs((p) => ({ ...p, [prov]: "" }));
      await onSecretsUpdated();
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-zinc-900">1. Mô hình chính (Primary LLM)</h3>
            <button type="button" onClick={() => handlePing("primary")} disabled={pinging !== null} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-50 cursor-pointer">
              {pinging === "primary" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Test Ping
            </button>
          </div>
          <label className="block text-xs font-bold text-zinc-600">
            Nhà cung cấp (Provider)
            <select value={config.primary_provider} onChange={(e) => { const p = e.target.value as AdminTutorConfig["primary_provider"]; onChange({ primary_provider: p, primary_base_url: PRESETS[p].base_url, primary_model: PRESETS[p].model }); }} className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-900">
              {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-zinc-600">
              Model ID
              <input value={config.primary_model} onChange={(e) => onChange({ primary_model: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900" />
            </label>
            <label className="block text-xs font-bold text-zinc-600">
              Temperature (0 - 1)
              <input type="number" step="0.05" min="0" max="1" value={config.temperature} onChange={(e) => onChange({ temperature: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900" />
            </label>
          </div>
          <label className="block text-xs font-bold text-zinc-600">
            Base URL (HTTPS / localhost)
            <input value={config.primary_base_url} onChange={(e) => onChange({ primary_base_url: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900" />
          </label>
          <div className="grid grid-cols-3 gap-2.5 items-center pt-1">
            <label className="block text-xs font-bold text-zinc-600">
              Max Tokens
              <input type="number" min="150" max="1200" value={config.max_output_tokens} onChange={(e) => onChange({ max_output_tokens: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs" />
            </label>
            <label className="block text-xs font-bold text-zinc-600">
              Timeout (s)
              <input type="number" min="10" max="90" value={config.timeout_seconds} onChange={(e) => onChange({ timeout_seconds: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs" />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 pt-4 cursor-pointer">
              <input type="checkbox" checked={config.enable_thinking} onChange={(e) => onChange({ enable_thinking: e.target.checked })} className="accent-[#932120]" />
              Thinking
            </label>
          </div>
          {pingResult.primary && (
            <div className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2 ${pingResult.primary.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
              {pingResult.primary.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>{pingResult.primary.ok ? `OK (${pingResult.primary.latency_ms}ms) · ${pingResult.primary.preview || pingResult.primary.reply || "Ready"}` : pingResult.primary.error}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-black text-zinc-900 cursor-pointer">
              <input type="checkbox" checked={config.failover_enabled} onChange={(e) => onChange({ failover_enabled: e.target.checked })} className="accent-[#932120]" />
              2. Mô hình dự phòng (Auto Failover)
            </label>
            <button type="button" onClick={() => handlePing("failover")} disabled={pinging !== null || !config.failover_enabled} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-50 disabled:opacity-40 cursor-pointer">
              {pinging === "failover" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Test Ping
            </button>
          </div>
          <label className="block text-xs font-bold text-zinc-600">
            Provider dự phòng
            <select value={config.failover_provider} disabled={!config.failover_enabled} onChange={(e) => { const p = e.target.value as AdminTutorConfig["failover_provider"]; onChange({ failover_provider: p, failover_base_url: PRESETS[p].base_url, failover_model: PRESETS[p].model }); }} className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-50">
              {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-zinc-600">
            Failover Model ID
            <input value={config.failover_model} disabled={!config.failover_enabled} onChange={(e) => onChange({ failover_model: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900 disabled:opacity-50" />
          </label>
          <label className="block text-xs font-bold text-zinc-600">
            Failover Base URL
            <input value={config.failover_base_url} disabled={!config.failover_enabled} onChange={(e) => onChange({ failover_base_url: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-900 disabled:opacity-50" />
          </label>
          {pingResult.failover && (
            <div className={`rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2 ${pingResult.failover.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
              {pingResult.failover.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>{pingResult.failover.ok ? `OK (${pingResult.failover.latency_ms}ms) · ${pingResult.failover.preview || pingResult.failover.reply || "Ready"}` : pingResult.failover.error}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#932120]" />
          <h3 className="text-sm font-black text-zinc-900">Quản lý API Key ghi đè (Mã hóa Write-Only, không trả về trình duyệt)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(PRESETS).map(([prov, info]) => {
            const st = providers[prov];
            const badge = st?.key_source === "admin_override" ? "bg-sky-50 text-sky-700 border-sky-200" : st?.key_source === "env" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200";
            return (
              <div key={prov} className="rounded-xl border border-zinc-200 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-zinc-800">{info.label}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge}`}>
                    {st?.key_source === "admin_override" ? `Admin: ${st.masked_key}` : st?.key_source === "env" ? "Đang dùng .env" : "Chưa cấu hình"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="password" value={keyInputs[prov] || ""} onChange={(e) => setKeyInputs((p) => ({ ...p, [prov]: e.target.value }))} placeholder="Nhập API Key mới để ghi đè..." className="flex-1 min-w-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-mono" />
                  <button type="button" disabled={!keyInputs[prov]?.trim() || savingKey === prov} onClick={() => handleSaveSecret(prov, false)} className="px-2.5 py-1.5 rounded-lg bg-[#932120] text-white text-xs font-bold hover:bg-[#7a1a19] disabled:opacity-40 cursor-pointer" title="Lưu Key mã hóa">
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  {st?.has_override && (
                    <button type="button" disabled={savingKey === prov} onClick={() => handleSaveSecret(prov, true)} className="px-2 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer" title="Xóa ghi đè, quay về .env">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
