import { NextResponse } from "next/server";
import { cgGet } from "../../_lib/coingecko";
import { getCache, setCache } from "../../_lib/cache";

export const runtime = "nodejs";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  categories?: string[];
  image: { small: string; thumb: string; large: string };
  links?: {
    homepage?: string[];
    blockchain_site?: string[];
    subreddit_url?: string;
    twitter_screen_name?: string;
    repos_url?: { github?: string[] };
  };
  market_data: {
    current_price: { usd: number };
    market_cap_rank: number;
    market_cap: { usd: number };
    fully_diluted_valuation?: { usd: number | null };
    total_volume: { usd: number };
    circulating_supply?: number | null;
    total_supply?: number | null;
    max_supply?: number | null;

    ath: { usd: number };
    ath_date: { usd: string };
    ath_change_percentage: { usd: number };

    atl: { usd: number };
    atl_date: { usd: string };
    atl_change_percentage: { usd: number };

    price_change_percentage_1h_in_currency?: { usd: number | null };
    price_change_percentage_24h_in_currency?: { usd: number | null };
    price_change_percentage_7d_in_currency?: { usd: number | null };
  };
};

type Payload = {
  data: Coin;
  fetchedAt: string;
  stale: boolean;
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const key = `coin:${id}`;
  const ttlMs = 30_000;
  const cached = getCache<Payload>(key);
  const isFresh = cached && (Date.now() - cached.ts) < ttlMs;
  if (isFresh) return NextResponse.json(cached!.value, { headers: { "x-cache": "HIT" } });

  try {
    const data = await cgGet<Coin>(`/coins/${encodeURIComponent(id)}`, {
      localization: "false",
      tickers: "false",
      market_data: "true",
      community_data: "false",
      developer_data: "false",
      sparkline: "false",
    });

    const payload: Payload = { data, fetchedAt: new Date().toISOString(), stale: false };
    setCache(key, payload);
    return NextResponse.json(payload, { headers: { "x-cache": "MISS" } });
  } catch {
    if (cached) return NextResponse.json({ ...cached.value, stale: true, fetchedAt: new Date().toISOString() }, { headers: { "x-cache": "STALE" } });
    return NextResponse.json({ error: "Coin data temporarily unavailable." }, { status: 503 });
  }
}
