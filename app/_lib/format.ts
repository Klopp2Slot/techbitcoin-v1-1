export function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1000 ? 0 : n >= 1 ? 2 : 6,
  }).format(n);
}

export function formatUsdCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  let value = n;
  let suffix = "";
  if (abs >= 1e12) { value = n / 1e12; suffix = "T"; }
  else if (abs >= 1e9) { value = n / 1e9; suffix = "B"; }
  else if (abs >= 1e6) { value = n / 1e6; suffix = "M"; }
  else if (abs >= 1e3) { value = n / 1e3; suffix = "K"; }

  const digits = abs >= 1e9 ? 2 : abs >= 1e6 ? 2 : abs >= 1e3 ? 1 : 0;
  const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
  return `$${num}${suffix}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function formatPct(n: number | null | undefined): { text: string; cls: "pos" | "neg" | "" } {
  if (n === null || n === undefined || Number.isNaN(n)) return { text: "—", cls: "" };
  const cls = n >= 0 ? "pos" : "neg";
  const sign = n >= 0 ? "+" : "";
  return { text: `${sign}${n.toFixed(2)}%`, cls };
}
