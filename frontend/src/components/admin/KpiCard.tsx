import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  subtext: string;
}

export function KpiCard({
  title,
  value,
  change,
  isPositive = true,
  icon,
  subtext,
}: KpiCardProps) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl">
          {icon}
        </div>
        {change && (
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              isPositive
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isPositive ? (
              <ArrowDownRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5" />
            )}
            {change}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-zinc-500 text-xs sm:text-sm font-semibold uppercase tracking-wider">
          {title}
        </h3>
        <div className="text-2xl sm:text-3xl font-black text-zinc-900 mt-1.5 tracking-tight">
          {value}
        </div>
        <p className="text-xs text-zinc-400 mt-2 font-medium">{subtext}</p>
      </div>
    </div>
  );
}
