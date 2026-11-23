"use client";

import React, { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { getAuditLog } from "@/services/admin-ai-monitoring";
import type { AuditLogItem } from "@/types/admin-ai-monitoring";
import { JsonDisclosure } from "./JsonDisclosure";
import { formatDateTime } from "./monitoring-format";

/** Dòng mở rộng: tải before/after khi mở. */
function AuditDetail({ id }: { id: string }) {
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-audit-log", id], queryFn: () => getAuditLog(id) });
  if (isLoading) return <div className="py-3"><Loader2 className="w-5 h-5 animate-spin text-[#932120]" /></div>;
  if (isError || !data) return <p className="py-2 text-sm text-zinc-500">Không tải được chi tiết.</p>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <JsonDisclosure title="Trước (before)" value={data.before} defaultOpen />
      <JsonDisclosure title="Sau (after)" value={data.after} defaultOpen />
    </div>
  );
}

/** Bảng audit log mới nhất trước; bấm dòng để xem before/after. */
export function AuditLogTable({ items }: { items: AuditLogItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-xs sm:text-sm text-left text-zinc-600">
        <thead className="text-xs text-zinc-600 uppercase bg-zinc-50 border-b border-zinc-200 font-bold">
          <tr>
            <th className="px-3 py-3 w-8" />
            <th className="px-3 py-3">Thời gian</th>
            <th className="px-3 py-3">Người thực hiện</th>
            <th className="px-3 py-3">Hành động</th>
            <th className="px-3 py-3">Đối tượng</th>
            <th className="px-3 py-3">Mã đối tượng</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {items.length === 0 ? (
            <tr><td colSpan={6} className="px-6 py-10 text-center text-zinc-400">Không có dòng audit log nào khớp bộ lọc</td></tr>
          ) : items.map((log) => {
            const open = openId === log.id;
            return (
              <Fragment key={log.id}>
                <tr onClick={() => setOpenId(open ? null : log.id)} className="bg-white hover:bg-zinc-50/70 cursor-pointer">
                  <td className="px-3 py-3">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                  <td className="px-3 py-3">{log.actor_type === "system" ? "Hệ thống" : log.admin_email ?? log.admin_id ?? "Admin"}</td>
                  <td className="px-3 py-3 font-mono text-xs font-semibold text-zinc-900">{log.action}</td>
                  <td className="px-3 py-3 font-mono text-xs">{log.entity}</td>
                  <td className="px-3 py-3 font-mono text-xs break-all">{log.entity_id ?? "—"}</td>
                </tr>
                {open && (
                  <tr className="bg-zinc-50/60"><td colSpan={6} className="px-4 py-4"><AuditDetail id={log.id} /></td></tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
