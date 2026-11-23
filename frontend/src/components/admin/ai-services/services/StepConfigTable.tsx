"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import type { RuntimeStepView, StepOverride } from "@/types/admin-ai-services";
import { EffectiveValue, ParamSourceBadge } from "./ParamSourceBadge";

function OverrideText({ override }: { override: StepOverride }) {
  const parts = [
    override.model !== undefined && `model: ${override.model}`,
    override.temperature !== undefined && `temperature: ${override.temperature}`,
    override.max_tokens !== undefined && `max_tokens: ${override.max_tokens}`,
  ].filter(Boolean) as string[];
  if (parts.length === 0) return <span className="text-zinc-400">Không ghi đè</span>;
  return (
    <ul className="space-y-0.5 font-mono text-xs text-[#932120]">
      {parts.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

interface StepConfigTableProps {
  steps: RuntimeStepView[];
  onEdit: (step: RuntimeStepView) => void;
  onReset: (step: RuntimeStepView) => void;
}

/** Bảng 8 bước chấm: giá trị đang có hiệu lực (kèm nguồn) và phần Admin ghi đè. */
export function StepConfigTable({ steps, onEdit, onReset }: StepConfigTableProps) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (step: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3">Bước</th>
            <th className="px-4 py-3">Prompt thuộc bước</th>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3">Temperature</th>
            <th className="px-4 py-3">Max tokens</th>
            <th className="px-4 py-3">Ghi đè</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => {
            const eff = s.effective;
            const hasOverride = Object.keys(s.override).length > 0;
            const expanded = open.has(s.step);
            return (
              <React.Fragment key={s.step}>
                <tr className="border-b border-zinc-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-bold text-zinc-900">{s.label}</div>
                    <div className="font-mono text-[10px] text-zinc-400">{s.step}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600 max-w-56">
                    {s.prompts.map((p) => (
                      <div key={p} className="font-mono break-all">{p}</div>
                    ))}
                  </td>
                  <td className="px-4 py-3"><EffectiveValue value={eff?.model.value} source={eff?.model.source} /></td>
                  <td className="px-4 py-3"><EffectiveValue value={eff?.temperature.value} source={eff?.temperature.source} /></td>
                  <td className="px-4 py-3"><EffectiveValue value={eff?.max_tokens.value} source={eff?.max_tokens.source} /></td>
                  <td className="px-4 py-3"><OverrideText override={s.override} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <button onClick={() => onEdit(s)} className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Sửa
                    </button>
                    {hasOverride && (
                      <button onClick={() => onReset(s)} className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50">
                        Bỏ ghi đè
                      </button>
                    )}
                  </td>
                </tr>
                {eff && (eff.per_prompt || eff.note) && (
                  <tr className="border-b border-zinc-100 bg-amber-50/50">
                    <td colSpan={7} className="px-4 py-2 text-xs text-amber-900">
                      <div className="flex items-start gap-2">
                        {eff.per_prompt && (
                          <button onClick={() => toggle(s.step)} className="font-bold inline-flex items-center gap-1 shrink-0" aria-expanded={expanded}>
                            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            Xem từng prompt
                          </button>
                        )}
                        <span>{eff.note ?? "Các prompt trong bước có giá trị khác nhau; bảng trên là giá trị của prompt đầu tiên."}</span>
                      </div>
                      {expanded && eff.per_prompt && (
                        <table className="mt-2 w-full text-xs bg-white rounded-lg border border-amber-200">
                          <thead>
                            <tr className="text-left text-zinc-500">
                              <th className="px-3 py-1.5">Prompt</th>
                              <th className="px-3 py-1.5">Model</th>
                              <th className="px-3 py-1.5">Temperature</th>
                              <th className="px-3 py-1.5">Max tokens</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eff.per_prompt.map((p) => (
                              <tr key={p.name} className="border-t border-zinc-100">
                                <td className="px-3 py-1.5 font-mono break-all">{p.name}</td>
                                <td className="px-3 py-1.5"><span className="font-mono">{p.model ?? "-"}</span> <ParamSourceBadge source={p.sources.model} /></td>
                                <td className="px-3 py-1.5"><span className="font-mono">{p.temperature ?? "-"}</span> <ParamSourceBadge source={p.sources.temperature} /></td>
                                <td className="px-3 py-1.5"><span className="font-mono">{p.max_tokens ?? "-"}</span> <ParamSourceBadge source={p.sources.max_tokens} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
