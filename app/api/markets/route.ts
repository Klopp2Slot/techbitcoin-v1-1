import { NextResponse } from "next/server";
import { cgGet } from "../_lib/coingecko";
import { getCache, setCache } from "../_lib/cache";

export const runtime = "nodejs";

type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap_rank: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
};

type Payload = {
  data: MarketRow[];
  page: number;
  per_page: number;
  category?: string;
  fetchedAt: string;
  stale: boolean;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const per_page = Math.min(250, Math.max(10, Number(searchParams.get("per_page") || "50")));
  const category = (searchParams.get("category") || "").trim() || undefined;

  const key = `markets:${category ?? "all"}:${page}:${per_page}`;
  const ttlMs = 20_000;

  const cached = getCache<Payload>(key);
  const isFresh = cached && (Date.now() - cached.ts) < ttlMs;

  if (isFresh) {
    return NextResponse.json(cached!.value, { headers: { "x-cache": "HIT" } });
  }

  try {
    const data = await cgGet<MarketRow[]>("/coins/markets", {
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page,
      page,
      category,
      sparkline: "false",
      price_change_percentage: "1h,24h,7d",
    });

    const payload: Payload = {
      data,
      page,
      per_page,
      category,
      fetchedAt: new Date().toISOString(),
      stale: false,
    };

    setCache(key, payload);
    return NextResponse.json(payload, { headers: { "x-cache": "MISS" } });
  } catch {
    if (cached) {
      const payload: Payload = { ...cached.value, stale: true, fetchedAt: new Date().toISOString() };
      return NextResponse.json(payload, { headers: { "x-cache": "STALE" } });
    }
    return NextResponse.json({ error: "Market data temporarily unavailable." }, { status: 503 });
  }
}
