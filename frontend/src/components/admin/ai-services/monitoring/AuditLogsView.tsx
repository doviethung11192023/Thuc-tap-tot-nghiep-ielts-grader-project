"use client";

import React, { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2, ScrollText } from "lucide-react";
import { getAuditLogs } from "@/services/admin-ai-monitoring";
import { getAdminUsers } from "@/services/users";
import type { AuditLogFilters } from "@/types/admin-ai-monitoring";
import { AuditLogFilterBar, type AdminOption } from "./AuditLogFilterBar";
import { AuditLogTable } from "./AuditLogTable";
import { MonitoringPagination } from "./MonitoringPagination";

const LIMIT = 20;

/** Trang Audit log (chỉ đọc): lọc, phân trang, xem before/after. */
export function AuditLogsView() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", filters, page],
    queryFn: () => getAuditLogs({ ...filters, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const admins = useQuery({
    queryKey: ["admin-audit-admin-options"],
    queryFn: async (): Promise<AdminOption[]> => {
      const res = await getAdminUsers({ role: "admin", limit: 100 });
      return (res.items ?? []).map((u: { id: string; email: string; full_name?: string }) => ({ id: u.id, label: u.email }));
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-5 sm:space-y-6 w-full">
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2.5">
          <ScrollText className="w-7 h-7 text-[#932120]" /> Audit log
        </h1>
        <p className="text-sm sm:text-base text-zinc-500 mt-1">Lịch sử thao tác của Admin và hệ thống. Chỉ đọc; key API không bao giờ xuất hiện ở đây.</p>
      </div>
      <AuditLogFilterBar value={filters} admins={admins.data ?? []} onChange={(next) => { setFilters(next); setPage(1); }} />
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#932120]" /></div>
        ) : (
          <>
            <AuditLogTable items={data?.items ?? []} />
            <MonitoringPagination page={page} limit={LIMIT} total={data?.total ?? 0} onPageChange={setPage} unit="dòng" />
          </>
        )}
      </div>
    </div>
  );
}
