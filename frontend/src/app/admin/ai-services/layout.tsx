"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu } from "lucide-react";

const TABS = [
  { href: "/admin/ai-services", label: "Tổng quan", exact: true },
  { href: "/admin/ai-services/models", label: "Cấu hình model" },
  { href: "/admin/ai-services/keys", label: "API key" },
  { href: "/admin/ai-services/runs", label: "Lượt chấm" },
  { href: "/admin/ai-services/usage", label: "Chi phí" },
  { href: "/admin/ai-services/prompts", label: "Prompt" },
];

/** Khung chung của khu vực Service AI: tiêu đề và thanh tab. */
export default function AiServicesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isActive = (tab: (typeof TABS)[number]) =>
    tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(tab.href + "/");

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-[#932120]" />
            Service AI
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Giám sát và cấu hình AI engine chấm bài: sức khoẻ, model, API key, lượt chấm, chi phí, prompt.</p>
        </div>
        <nav className="flex gap-2.5 overflow-x-auto pb-1" aria-label="Các mục Service AI">
          {TABS.map((tab) => {
            const active = isActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  active ? "bg-[#932120] text-white shadow-xs" : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
