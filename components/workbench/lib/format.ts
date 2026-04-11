/** Shared formatting helpers used across workbench panels. */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdSigned = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

const pct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function formatUsd(n: number): string {
  return usd.format(n);
}

export function formatUsdSigned(n: number): string {
  return usdSigned.format(n);
}

export function formatPercent(n: number): string {
  return pct.format(n);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Confidence -> color mapping used by ReturnSurface / FieldWithConfidence.
 * >= 0.9 green, 0.75-0.89 cyan, 0.5-0.74 amber, < 0.5 red.
 */
export function confidenceColor(confidence: number): {
  bar: string;
  text: string;
  label: string;
} {
  if (confidence >= 0.9) {
    return {
      bar: "#06d6a0",
      text: "text-emerald-300",
      label: "high",
    };
  }
  if (confidence >= 0.75) {
    return {
      bar: "#3b82f6",
      text: "text-sky-300",
      label: "ok",
    };
  }
  if (confidence >= 0.5) {
    return {
      bar: "#f59e0b",
      text: "text-amber-300",
      label: "watch",
    };
  }
  return { bar: "#ef4444", text: "text-red-300", label: "low" };
}

export function severityColor(severity: 1 | 2 | 3 | 4 | 5): string {
  switch (severity) {
    case 5:
      return "pill pill-red";
    case 4:
      return "pill pill-amber";
    case 3:
      return "pill pill-violet";
    case 2:
      return "pill pill-blue";
    default:
      return "pill pill-cyan";
  }
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
