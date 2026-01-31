import { NextResponse } from "next/server";
import { cgGet } from "../../../_lib/coingecko";
import { getCache, setCache } from "../../../_lib/cache";

export const runtime = "nodejs";

type Chart = { prices: [number, number][] };

type Payload = { data: Chart; fetchedAt: string; stale: boolean };

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(30, Math.max(1, Number(searchParams.get("days") || "7")));
  const id = params.id;
  const key = `chart:${id}:${days}`;
  const ttlMs = 60_000;

  const cached = getCache<Payload>(key);
  const isFresh = cached && (Date.now() - cached.ts) < ttlMs;
  if (isFresh) return NextResponse.json(cached!.value, { headers: { "x-cache": "HIT" } });

  try {
    const data = await cgGet<Chart>(`/coins/${encodeURIComponent(id)}/market_chart`, {
      vs_currency: "usd",
      days,
    });
    const payload: Payload = { data, fetchedAt: new Date().toISOString(), stale: false };
    setCache(key, payload);
    return NextResponse.json(payload, { headers: { "x-cache": "MISS" } });
  } catch {
    if (cached) return NextResponse.json({ ...cached.value, stale: true, fetchedAt: new Date().toISOString() }, { headers: { "x-cache": "STALE" } });
    return NextResponse.json({ error: "Chart data temporarily unavailable." }, { status: 503 });
  }
}
