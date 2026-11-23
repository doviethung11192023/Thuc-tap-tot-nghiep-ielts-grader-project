"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { aiServiceErrorMessage, getServicesHealth } from "@/services/admin-ai-services";
import type { ServiceHealthRow } from "@/types/admin-ai-services";
import { Notice } from "./Notice";
import { ServiceStatusBadge } from "./ServiceStatusBadge";

interface Row extends ServiceHealthRow {
  checkedAt: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString("vi-VN");
}

/** Tổng quan sức khoẻ: mở trang tự kiểm tất cả; kiểm lại từng dòng chỉ cập nhật dòng đó. */
export function ServiceHealthPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingOne, setLoadingOne] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAll = useCallback(async () => {
    setLoadingAll(true);
    setError(null);
    try {
      const data = await getServicesHealth("all");
      setRows(data.services.map((s) => ({ ...s, checkedAt: data.checked_at })));
    } catch (err) {
      setError(aiServiceErrorMessage(err, "Không kiểm tra được sức khoẻ service"));
    } finally {
      setLoadingAll(false);
    }
  }, []);

  useEffect(() => {
    // Tự kiểm khi mở trang; chỉ cập nhật state sau khi có kết quả
    let cancelled = false;
    getServicesHealth("all")
      .then((data) => {
        if (!cancelled) setRows(data.services.map((s) => ({ ...s, checkedAt: data.checked_at })));
      })
      .catch((err) => {
        if (!cancelled) setError(aiServiceErrorMessage(err, "Không kiểm tra được sức khoẻ service"));
      })
      .finally(() => {
        if (!cancelled) setLoadingAll(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkOne = async (service: string) => {
    setLoadingOne(service);
    setError(null);
    try {
      const data = await getServicesHealth(service);
      const fresh = data.services.find((s) => s.service === service);
      if (fresh) {
        setRows((prev) => prev.map((r) => (r.service === service ? { ...fresh, checkedAt: data.checked_at } : r)));
      }
    } catch (err) {
      setError(aiServiceErrorMessage(err, `Không kiểm tra lại được ${service}`));
    } finally {
      setLoadingOne(null);
    }
  };

  const busy = loadingAll || loadingOne !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Trạng thái AI engine và các service nó phụ thuộc. Kiểm tra có thể mất tới 20 giây.</p>
        <button
          onClick={checkAll}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-[#932120] text-white text-sm font-bold hover:bg-[#7a1a19] disabled:opacity-60 flex items-center gap-2"
        >
          {loadingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Kiểm tra lại tất cả
        </button>
      </div>

      {error && <Notice kind="error" onClose={() => setError(null)}>{error}</Notice>}

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 bg-zinc-50">
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Độ trễ</th>
              <th className="px-4 py-3">Chi tiết</th>
              <th className="px-4 py-3">Lỗi</th>
              <th className="px-4 py-3">Giờ kiểm</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loadingAll && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-[#932120]" />
                  Đang kiểm tra các service…
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const rowBusy = loadingAll || loadingOne === row.service;
              return (
                <tr key={row.service} className="border-b border-zinc-100 last:border-0 align-top">
                  <td className="px-4 py-3 font-bold text-zinc-900">{row.label}</td>
                  <td className="px-4 py-3">
                    {rowBusy ? <Loader2 className="w-4 h-4 animate-spin text-[#932120]" /> : <ServiceStatusBadge status={row.status} />}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">{row.latency_ms != null ? `${row.latency_ms} ms` : "-"}</td>
                  <td className="px-4 py-3 text-zinc-600 max-w-xs break-words">{row.detail ?? "-"}</td>
                  <td className="px-4 py-3 text-red-700 max-w-xs break-words">{row.error ?? ""}</td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{formatTime(row.checkedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => checkOne(row.service)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      Kiểm tra lại
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
