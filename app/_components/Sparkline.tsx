"use client";

export default function Sparkline({ prices }: { prices: number[] }) {
  if (!prices || prices.length < 2) return null;

  const w = 1000;
  const h = 220;
  const pad = 16;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1e-9, max - min);

  const pts = prices.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / (prices.length - 1);
    const y = pad + (1 - (p - min) / span) * (h - pad * 2);
    return [x, y];
  });

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="220" role="img" aria-label="7 day price chart">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(57,255,20,0.35)"/>
          <stop offset="100%" stopColor="rgba(57,255,20,0)"/>
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="rgba(57,255,20,0.9)" strokeWidth="4" />
      <path d={`${d} L${w-pad},${h-pad} L${pad},${h-pad} Z`} fill="url(#g)" opacity="0.8"/>
    </svg>
  );
}
