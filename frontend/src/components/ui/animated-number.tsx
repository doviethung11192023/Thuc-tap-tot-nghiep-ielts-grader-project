"use client";

import React, { useEffect, useState } from "react";
import NumberFlow, { usePrefersReducedMotion } from "@number-flow/react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Smooth tabular number counter that avoids SSR mismatch and honors reduced-motion. */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix,
  suffix,
  className,
}: AnimatedNumberProps) {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  const safeValue = Number.isFinite(value) ? value : 0;
  const formattedFallback = `${prefix ?? ""}${safeValue.toFixed(decimals)}${suffix ?? ""}`;

  if (!mounted || reducedMotion) {
    return <span className={cn("tabular-nums", className)}>{formattedFallback}</span>;
  }

  return (
    <NumberFlow
      value={safeValue}
      prefix={prefix}
      suffix={suffix}
      format={{
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }}
      className={cn("tabular-nums", className)}
    />
  );
}
