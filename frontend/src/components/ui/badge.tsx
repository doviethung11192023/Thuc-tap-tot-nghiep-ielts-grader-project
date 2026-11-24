import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-tight whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        crimson: "bg-rose-50 text-[#932120] border-rose-200",
        emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
        amber: "bg-amber-50 text-amber-800 border-amber-200",
        zinc: "bg-zinc-100 text-zinc-700 border-zinc-200",
        sky: "bg-sky-50 text-sky-800 border-sky-200",
        danger: "bg-red-50 text-red-700 border-red-200",
      },
    },
    defaultVariants: {
      variant: "zinc",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** Semantic badge component using MoonLab palette (zero purple/violet/indigo). */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
