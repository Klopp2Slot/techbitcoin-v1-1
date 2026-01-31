import { NextResponse } from "next/server";
import { cgGet } from "../_lib/coingecko";
import { getCache, setCache } from "../_lib/cache";

export const runtime = "nodejs";

type MarketRow = {
  market_cap: number;
  total_volume: number;
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap_rank: number;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
};

type Payload = {
  data: MarketRow[];
  fetchedAt: string;
  stale: boolean;
  sourcePages: number[];
};

export async function GET() {
  const key = "markets:top1000";
  const ttlMs = 30_000;

  const cached = getCache<Payload>(key);
  const isFresh = cached && (Date.now() - cached.ts) < ttlMs;

  if (isFresh) {
    return NextResponse.json(cached!.value, { headers: { "x-cache": "HIT" } });
  }

  const per_page = 250;
  const pages = [1, 2, 3, 4];

  try {
    const results = await Promise.all(
      pages.map((page) =>
        cgGet<MarketRow[]>("/coins/markets", {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page,
          page,
          sparkline: "false",
          price_change_percentage: "1h,24h,7d",
        })
      )
    );

    const data = results.flat().sort((a, b) => (a.market_cap_rank ?? 1e9) - (b.market_cap_rank ?? 1e9));

    const payload: Payload = {
      data,
      fetchedAt: new Date().toISOString(),
      stale: false,
      sourcePages: pages,
    };

    setCache(key, payload);
    return NextResponse.json(payload, { headers: { "x-cache": "MISS" } });
  } catch {
    // stale fallback
    if (cached) {
      const payload: Payload = { ...cached.value, stale: true, fetchedAt: new Date().toISOString() };
      return NextResponse.json(payload, { headers: { "x-cache": "STALE" } });
    }
    return NextResponse.json(
      { error: "Market data temporarily unavailable." },
      { status: 503 }
    );
  }
}
