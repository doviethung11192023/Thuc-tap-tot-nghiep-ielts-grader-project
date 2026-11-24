"use client";

import React from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  direction?: "bottom" | "left" | "right";
  children: React.ReactNode;
  className?: string;
}

/** Touch-friendly Vaul drawer for mobile navigation, filters, and exam palettes. */
export function MobileDrawer({
  open,
  onOpenChange,
  title,
  description,
  direction = "bottom",
  children,
  className,
}: MobileDrawerProps) {
  const isSide = direction === "left" || direction === "right";

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={direction}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-zinc-950/45 backdrop-blur-[2px]" />
        <Drawer.Content
          className={cn(
            "fixed z-50 flex flex-col bg-[var(--ux-surface)] text-[var(--ux-ink)] shadow-2xl border-[var(--ux-line)] focus:outline-none",
            direction === "bottom" &&
              "inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t px-4 pb-6 pt-3",
            direction === "left" &&
              "inset-y-0 left-0 w-[290px] max-w-[85vw] border-r p-4",
            direction === "right" &&
              "inset-y-0 right-0 w-[320px] max-w-[88vw] border-l p-4",
            className
          )}
        >
          {direction === "bottom" && (
            <div className="mx-auto mb-3 h-1.5 w-11 shrink-0 rounded-full bg-[var(--ux-line-2)]" />
          )}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--ux-line)]">
            <div className="min-w-0">
              <Drawer.Title className="text-base font-extrabold text-[var(--ux-ink)] truncate">
                {title}
              </Drawer.Title>
              <Drawer.Description className={description ? "text-xs text-[var(--ux-ink-2)] mt-0.5" : "sr-only"}>
                {description || title}
              </Drawer.Description>
            </div>
            {isSide && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Đóng menu"
                className="rounded-xl p-2 text-[var(--ux-ink-2)] hover:bg-[var(--ux-surface-2)] hover:text-[var(--ux-ink)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-3 flex-1 overflow-y-auto custom-scrollbar">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
