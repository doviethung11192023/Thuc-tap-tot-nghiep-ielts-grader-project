"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { BlurFadeCard, SpotlightCard, type SpotlightTone } from "@/components/motion";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  subtext: string;
  index?: number;
  tone?: SpotlightTone;
}

function parseNumericDisplay(raw: string): { num: number; decimals: number; suffix: string } | null {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*(%|s|h|m|ms|)$/i);
  if (!match) return null;
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return null;
  const fracPart = match[1].split(".")[1];
  return {
    num,
    decimals: fracPart ? fracPart.length : 0,
    suffix: match[2] || "",
  };
}

export function KpiCard({
  title,
  value,
  change,
  isPositive = true,
  icon,
  subtext,
  index = 0,
  tone = "crimson",
}: KpiCardProps) {
  const prefersReduced = useReducedMotion();
  const parsed = parseNumericDisplay(value);

  return (
    <BlurFadeCard index={index} inView={false} className="h-full">
      <SpotlightCard
        tone={tone}
        className="bg-[var(--ux-surface)] p-5 sm:p-6 rounded-2xl border border-[var(--ux-line)] shadow-xs flex flex-col justify-between h-full hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
      >
        <div className="flex justify-between items-start mb-4 relative z-10">
          <m.div
            initial={prefersReduced ? false : { scale: 0.65 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 20, delay: Math.min(index * 0.045, 0.2) + 0.1 }}
            className="p-2.5 bg-[var(--ux-surface-2)] border border-[var(--ux-line)] rounded-xl"
          >
            {icon}
          </m.div>
          {change && (
            <div
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                isPositive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
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
        <div className="relative z-10">
          <h3 className="text-[var(--ux-ink-2)] text-xs sm:text-sm font-semibold uppercase tracking-wider">
            {title}
          </h3>
          <div className="text-2xl sm:text-3xl font-black text-[var(--ux-ink)] mt-1.5 tracking-tight tabular-nums">
            {parsed ? (
              <AnimatedNumber value={parsed.num} decimals={parsed.decimals} suffix={parsed.suffix} />
            ) : (
              value
            )}
          </div>
          <p className="text-xs text-[var(--ux-ink-3)] mt-2 font-medium">{subtext}</p>
        </div>
      </SpotlightCard>
    </BlurFadeCard>
  );
}
