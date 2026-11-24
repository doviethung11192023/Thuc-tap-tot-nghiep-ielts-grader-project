// Lucian UX/UI Prompt #088/#092 inspired · Academic Empty & Error State (MoonLab adapted)
import React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Clean academic empty state with clear recovery action and zero clutter. */
export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "rounded-2xl border border-dashed border-[var(--ux-line-2)] bg-[var(--ux-surface)] px-6 py-10 text-center flex flex-col items-center justify-center gap-3",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--ux-line)] bg-[var(--ux-surface-2)] text-[var(--ux-ink-2)] shadow-2xs">
        {icon || <Inbox className="h-5 w-5" />}
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-sm sm:text-base font-bold text-[var(--ux-ink)]">{title}</h3>
        {description && (
          <p className="text-xs sm:text-sm text-[var(--ux-ink-2)] leading-relaxed">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
