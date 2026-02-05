import Link from "next/link";
import { formatNumber, formatPct, formatUsd, formatUsdCompact } from "../../_lib/format";

/* ===================== Types ===================== */

type CoinLinks = {
  homepage?: string[];
  subreddit_url?: string | null;
  blockchain_site?: string[];
  repos_url?: { github?: string[] };
  twitter_screen_name?: string | null;
};

type CoinMarketData = {
  current_price?: { usd?: number };
  market_cap?: { usd?: number };
  total_volume?: { usd?: number };
  fully_diluted_valuation?: { usd?: number };
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;

  price_change_percentage_1h_in_currency?: { usd?: number };
  price_change_percentage_24h?: number;
  price_change_percentage_7d?: number;

  ath?: { usd?: number };
  ath_date?: { usd?: string };
  atl?: { usd?: number };
  atl_date?: { usd?: string };
};

type Coin = {
  id: string;
  name: string;
  symbol: string;
  image?: { small?: string };
  market_cap_rank?: number;
  categories?: string[];
  links?: CoinLinks;
  market_data?: CoinMarketData;
};

type StatusUpdate = {
  description?: string;
  category?: string;
  created_at?: string;
};

type MarketChart = {
  prices?: Array<[number, number]>;
};

type RedditPost = {
  title: string;
  url: string;
  createdUtc?: number;
  sourceLabel: string;
};

/* ===================== Helpers ===================== */

function safeFirst<T>(arr?: T[] | null): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[0];
}

function safeDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function formatRedditTime(createdUtc?: number) {
  if (!createdUtc) return "—";
  const d = new Date(createdUtc * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function pctClass(v?: number) {
  if (typeof v !== "number") return "text-gray-300/80";
  return v >= 0 ? "text-emerald-200" : "text-rose-200";
}

function buildSparklinePath(values: number[], w = 100, h = 30, pad = 2) {
  if (!values || values.length < 2) return { d: "", min: 0, max: 0 };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / range) * innerH;
    return [x, y] as const;
  });

  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  return { d, min, max };
}

/* ===================== CoinGecko ===================== */

async function fetchCoin(id: string): Promise<Coin | null> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    id
  )}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Coin;
}

async function fetchStatusUpdates(id: string): Promise<StatusUpdate[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    id
  )}/status_updates?per_page=10&page=1`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.status_updates ?? []) as StatusUpdate[];
}

async function fetchMarketChart24h(id: string): Promise<MarketChart | null> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    id
  )}/market_chart?vs_currency=usd&days=1`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as MarketChart;
}

/* ===================== Reddit (JSON, reliable) ===================== */

function pickSubredditForCoin(coinId: string, symbol: string): string | null {
  const key = (coinId || "").toLowerCase();
  const sym = (symbol || "").toLowerCase();

  const map: Record<string, string> = {
    bitcoin: "Bitcoin",
    ethereum: "ethereum",
    tether: "Tether",
    "usd-coin": "USDC",
    binancecoin: "binance",
    solana: "solana",
    ripple: "Ripple",
    cardano: "cardano",
    dogecoin: "dogecoin",
    tron: "Tronix",
    polkadot: "dot",
    chainlink: "Chainlink",
    avalanche: "Avax",
    toncoin: "TONcoin",
    stellar: "Stellar",
    monero: "Monero",
    litecoin: "litecoin",
    uniswap: "UniSwap",
    aave: "aave_official",
    maker: "MakerDAO",
    cosmos: "cosmosnetwork",
    filecoin: "filecoin",
    near: "nearprotocol",
    aptos: "aptos",
    arbitrum: "arbitrum",
    optimism: "Optimism",
    sui: "Sui",
    pepe: "pepecoin",
    shiba: "SHIBArmy",
  };

  if (map[key]) return map[key];
  if (map[sym]) return map[sym];
  return null;
}

async function fetchRedditJson(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "techbitcoin/1.0",
      "Accept": "application/json,text/plain,*/*",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchRedditPosts(coinId: string, symbol: string, name: string, limit = 10): Promise<RedditPost[]> {
  const subreddit = pickSubredditForCoin(coinId, symbol);

  const sources: Array<{ url: string; label: string }> = [];

  if (subreddit) {
    sources.push({
      url: `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${limit}`,
      label: `r/${subreddit}`,
    });
  }

  const q = `${name} OR ${symbol.toUpperCase()}`;
  sources.push({
    url: `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=new&t=day&limit=${limit}`,
    label: "Reddit search (24h)",
  });

  const posts: RedditPost[] = [];

  for (const src of sources) {
    if (posts.length >= limit) break;

    const json = await fetchRedditJson(src.url);
    const children = json?.data?.children ?? [];

    for (const c of children) {
      if (posts.length >= limit) break;

      const d = c?.data;
      const title = (d?.title ?? "").toString().trim();
      const permalink = (d?.permalink ?? "").toString().trim();
      const createdUtc = typeof d?.created_utc === "number" ? d.created_utc : undefined;

      if (!title || !permalink) continue;

      const url = `https://www.reddit.com${permalink}`;
      if (posts.some((p) => p.url === url)) continue;

      posts.push({ title, url, createdUtc, sourceLabel: src.label });
    }
  }

  return posts.slice(0, limit);
}

/* ===================== Page ===================== */

export default async function CoinPage({ params }: { params: { id: string } }) {
  const id = params?.id;

  if (!id) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Coin not found</h1>
        <Link href="/" className="text-amber-200 underline mt-4 inline-block">
          ← Back to markets
        </Link>
      </div>
    );
  }

  const [coin, updates, chart] = await Promise.all([
    fetchCoin(id),
    fetchStatusUpdates(id),
    fetchMarketChart24h(id),
  ]);

  if (!coin || !coin.market_data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Coin data unavailable</h1>
        <Link href="/" className="text-amber-200 underline mt-4 inline-block">
          ← Back to markets
        </Link>
      </div>
    );
  }

  const redditPosts = await fetchRedditPosts(coin.id, coin.symbol, coin.name, 10);

  const md = coin.market_data;

  const p1h = md.price_change_percentage_1h_in_currency?.usd;
  const p24h = md.price_change_percentage_24h;
  const p7d = md.price_change_percentage_7d;

  const prices = (chart?.prices ?? []).map((p) => p?.[1]).filter((n): n is number => typeof n === "number");
  const sampled = prices.length > 120 ? prices.filter((_, i) => i % 3 === 0) : prices;
  const spark = buildSparklinePath(sampled, 100, 30, 2);

  const current = md.current_price?.usd;
  const min24h = sampled.length ? Math.min(...sampled) : undefined;
  const max24h = sampled.length ? Math.max(...sampled) : undefined;

  const trendUp = typeof p24h === "number" ? p24h >= 0 : true;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Link href="/" className="text-black/90 underline underline-offset-4">
            ← Back to markets
          </Link>
          <div className="mt-4 flex items-center gap-3">
            {coin.image?.small ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coin.image.small} alt="" className="w-10 h-10 rounded-full ring-2 ring-white/60" />
            ) : null}
            <h1 className="text-3xl font-extrabold text-black">
              {coin.name} <span className="text-black/70">({coin.symbol?.toUpperCase()})</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Price + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-gray-300 text-sm">Price</div>
            <div className="mt-1 text-3xl font-semibold">{formatUsd(current)}</div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <span className={pctClass(p1h)}>1h: {formatPct(p1h)?.text ?? "—"}</span>
              <span className={pctClass(p24h)}>24h: {formatPct(p24h)?.text ?? "—"}</span>
              <span className={pctClass(p7d)}>7d: {formatPct(p7d)?.text ?? "—"}</span>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              24h Low/High: <span className="text-gray-200">{formatUsd(min24h)}</span> /{" "}
              <span className="text-gray-200">{formatUsd(max24h)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 lg:col-span-2">
            <div className="text-gray-300 text-sm">24h Price Chart</div>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
              {spark.d ? (
                <svg viewBox="0 0 100 30" width="100%" height="112" style={{ display: "block" }}>
                  <path d={spark.d} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="3" />
                  <path
                    d={spark.d}
                    fill="none"
                    stroke={trendUp ? "rgba(167,243,208,0.95)" : "rgba(251,113,133,0.95)"}
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <div className="text-sm text-gray-500">Chart unavailable.</div>
              )}
            </div>
          </div>
        </div>

        {/* Reddit feed */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between">
            <div className="text-gray-300 text-sm">Latest from Reddit</div>
            <a
              className="text-xs text-amber-200 underline"
              href={`https://www.reddit.com/search/?q=${encodeURIComponent(coin.name)}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Reddit
            </a>
          </div>

          {redditPosts.length === 0 ? (
            <div className="text-gray-500 text-sm mt-3">No recent Reddit posts found.</div>
          ) : (
            <ul className="mt-3 space-y-3">
              {redditPosts.map((p, idx) => (
                <li key={idx} className="text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-gray-100 hover:underline">
                      {p.title}
                    </a>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatRedditTime(p.createdUtc)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Source: {p.sourceLabel}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10 text-xs text-gray-500">Data sources: CoinGecko + Reddit</div>
      </div>
    </div>
  );
}
