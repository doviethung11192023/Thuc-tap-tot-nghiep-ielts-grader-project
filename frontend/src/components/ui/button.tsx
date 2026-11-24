"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-all cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#932120] active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-[#932120] text-white hover:bg-[#7a1a19] shadow-xs",
        secondary: "bg-[var(--ux-surface-2)] text-[var(--ux-ink)] border border-[var(--ux-line)] hover:bg-[var(--ux-surface-3)]",
        outline: "bg-[var(--ux-surface)] text-[var(--ux-ink)] border border-[var(--ux-line-2)] hover:bg-[var(--ux-surface-2)] shadow-2xs",
        ghost: "bg-transparent text-[var(--ux-ink-2)] hover:bg-[var(--ux-surface-2)] hover:text-[var(--ux-ink)]",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-xs",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  ref?: React.Ref<HTMLButtonElement>;
}

/** Accessible button primitive aligned with MoonLab Crimson & Lucian UX tokens. */
export function Button({ className, variant, size, type = "button", ref, ...props }: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
