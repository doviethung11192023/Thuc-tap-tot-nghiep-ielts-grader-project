import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-xl bg-[var(--ux-surface-3)]/70", className)}
      {...props}
    />
  );
}

interface ChartSkeletonProps {
  /** Explicit height class matching the hydrated chart wrapper so CLS stays 0. */
  heightClass?: string;
  label?: string;
  className?: string;
}

/** Fixed-height chart placeholder preventing Cumulative Layout Shift during dynamic load. */
export function ChartSkeleton({
  heightClass = "h-80",
  label = "Đang tải biểu đồ...",
  className,
}: ChartSkeletonProps) {
  return (
    <div
      data-slot="chart-skeleton"
      role="status"
      aria-label={label}
      className={cn(
        "w-full rounded-2xl border border-[var(--ux-line)] bg-[var(--ux-surface)] p-5 flex flex-col justify-between",
        heightClass,
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex-1 flex items-end gap-3 pt-6 pb-2">
        <Skeleton className="flex-1 h-[38%]" />
        <Skeleton className="flex-1 h-[62%]" />
        <Skeleton className="flex-1 h-[48%]" />
        <Skeleton className="flex-1 h-[78%]" />
        <Skeleton className="flex-1 h-[56%]" />
        <Skeleton className="flex-1 h-[84%]" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}
