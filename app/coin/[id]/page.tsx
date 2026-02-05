import Link from "next/link";
import { formatNumber, formatPct, formatUsd, formatUsdCompact } from "../../_lib/format";

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
  user?: string;
  user_title?: string;
};

type MarketChart = {
  prices?: Array<[number, number]>; // [timestamp, price]
};

type RedditPost = {
  title: string;
  url: string;
  updated?: string;
  sourceLabel: string;
};

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

function safeDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function pctClass(v?: number) {
  if (typeof v !== "number") return "text-gray-300/80";
  return v >= 0 ? "text-emerald-200" : "text-rose-200";
}

function buildSparklinePath(values: number[], w = 100, h = 30, pad = 2) {
  if (!values || values.length < 2) return { d: "", min: 0, max: 0, last: undefined as number | undefined };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / range) * innerH; // invert
    return [x, y] as const;
  });

  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  return { d, min, max, last: values[values.length - 1] };
}

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

/**
 * Reddit RSS (Atom) parsing without extra libraries.
 * Reddit returns Atom feeds with <entry> nodes.
 */
function decodeHtmlEntities(s: string) {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function pickSubredditForCoin(coinId: string, symbol: string, name: string): string | null {
  const key = (coinId || "").toLowerCase();
  const sym = (symbol || "").toLowerCase();
  const nm = (name || "").toLowerCase();

  // Common, high-signal mappings (MVP)
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
    "the-open-network": "TONcoin",
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

  // Heuristic: if name is very distinctive, try it as subreddit (not guaranteed).
  // We keep this conservative and fall back to search otherwise.
  if (nm.length >= 4 && nm.length <= 18 && /^[a-z0-9\- ]+$/.test(nm)) {
    // don't try generic words
    const generic = new Set(["usd", "coin", "token", "network", "protocol", "cash"]);
    if (!generic.has(nm)) return null;
  }

  return null;
}

async function fetchRedditPosts(coinId: string, symbol: string, name: string, limit = 10): Promise<RedditPost[]> {
  const subreddit = pickSubredditForCoin(coinId, symbol, name);

  const urls: Array<{ url: string; label: string }> = [];

  if (subreddit) {
    // "new" feed for subreddit
    urls.push({
      url: `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new/.rss`,
      label: `r/${subreddit}`,
    });
  }

  // Fallback / additional signal: sitewide search RSS
  const q = `${name} OR ${symbol.toUpperCase()}`;
  urls.push({
    url: `https://www.reddit.com/search.rss?q=${encodeURIComponent(q)}&sort=new&t=day`,
    label: "Reddit search (24h)",
  });

  // Try each source until we get enough posts
  const posts: RedditPost[] = [];

  for (const src of urls) {
    if (posts.length >= limit) break;

    const res = await fetch(src.url, {
      cache: "no-store",
      headers: {
        // Reddit prefers a user-agent
        "User-Agent": "techbitcoin/1.0 (RSS reader; contact: techbitcoin.com)",
        "Accept": "application/atom+xml,application/xml,text/xml,*/*",
      },
    });

    if (!res.ok) continue;

    const xml = await res.text();

    // Split by <entry> … </entry>
    const entryRegex = /<entry\b[\s\S]*?<\/entry>/g;
    const entries = xml.match(entryRegex) ?? [];

    for (const entry of entries) {
      if (posts.length >= limit) break;

      // title
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const rawTitle = titleMatch?.[1]?.trim() ?? "";
      const title = decodeHtmlEntities(rawTitle.replaceAll("\n", " ").replace(/\s+/g, " "));

      // updated
      const updatedMatch = entry.match(/<updated>([\s\S]*?)<\/updated>/);
      const updated = updatedMatch?.[1]?.trim();

      // link (atom uses <link rel="alternate" href="..."/>)
      const linkMatch = entry.match(/<link[^>]*?rel="alternate"[^>]*?href="([^"]+)"[^>]*\/?>/);
      const url = decodeHtmlEntities(linkMatch?.[1] ?? "");

      // Skip empties
      if (!title || !url) continue;

      // Avoid duplicates
      if (posts.some((p) => p.url === url)) continue;

      posts.push({ title, url, updated, sourceLabel: src.label });
    }
  }

  return posts.slice(0, limit);
}

export default async function CoinPage({ params }: { params: { id: string } }) {
  const id = params?.id;

  if (!id) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Coin not found</h1>
        <p className="text-gray-400 mt-2">Missing coin id in the URL.</p>
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
        <p className="text-gray-400 mt-2">
          This asset didn’t return full market data from CoinGecko right now.
        </p>
        <Link href="/" className="text-amber-200 underline mt-4 inline-block">
          ← Back to markets
        </Link>
      </div>
    );
  }

  // Fetch Reddit posts after we have coin name/symbol
  const redditPosts = await fetchRedditPosts(coin.id, coin.symbol, coin.name, 10);

  const md = coin.market_data;
  const website = safeFirst(coin.links?.homepage);
  const explorer = safeFirst((coin.links?.blockchain_site?.filter(Boolean) as string[] | undefined) ?? []);
  const reddit = coin.links?.subreddit_url ?? undefined;
  const github = safeFirst(coin.links?.repos_url?.github);
  const twitter =
    coin.links?.twitter_screen_name ? `https://x.com/${coin.links.twitter_screen_name}` : undefined;

  const p1h = md.price_change_percentage_1h_in_currency?.usd;
  const p24h = md.price_change_percentage_24h;
  const p7d = md.price_change_percentage_7d;

  const prices = (chart?.prices ?? []).map((p) => p?.[1]).filter((n): n is number => typeof n === "number");
  const sampled = prices.length > 120 ? prices.filter((_, i) => i % 3 === 0) : prices; // keep SVG light
  const spark = buildSparklinePath(sampled, 100, 30, 2);

  const current = md.current_price?.usd;
  const min24h = sampled.length ? Math.min(...sampled) : undefined;
  const max24h = sampled.length ? Math.max(...sampled) : undefined;

  const trendUp = typeof p24h === "number" ? p24h >= 0 : true;

  return (
    <div className="min-h-screen">
      {/* Warm gradient header */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-black/90 underline underline-offset-4">
              ← Back to markets
            </Link>
            <div className="text-black/80 text-sm">
              Rank: <span className="font-semibold">#{coin.market_cap_rank ?? "—"}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {coin.image?.small ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coin.image.small}
                alt={`${coin.name} logo`}
                className="w-10 h-10 rounded-full ring-2 ring-white/60"
              />
            ) : null}
            <div>
              <h1 className="text-3xl font-extrabold text-black">
                {coin.name} <span className="text-black/70">({coin.symbol?.toUpperCase()})</span>
              </h1>
              <div className="text-black/70 text-sm">Live 24h view • Data: CoinGecko</div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Top row: price + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur p-5">
            <div className="text-gray-300 text-sm">Price</div>
            <div className="mt-1 text-3xl font-semibold">{formatUsd(current)}</div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <span className={pctClass(p1h)}>1h: {formatPct(p1h)?.text ?? "—"}</span>
              <span className={pctClass(p24h)}>24h: {formatPct(p24h)?.text ?? "—"}</span>
              <span className={pctClass(p7d)}>7d: {formatPct(p7d)?.text ?? "—"}</span>
            </div>

            <div className="mt-4 text-xs text-gray-400">
              24h Low/High:{" "}
              <span className="text-gray-200">{formatUsd(min24h)}</span> /{" "}
              <span className="text-gray-200">{formatUsd(max24h)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-gray-300 text-sm">24h Price Chart</div>
              <div className="text-xs text-gray-400">
                {spark.min && spark.max ? (
                  <>
                    Range: <span className="text-gray-200">{formatUsd(spark.min)}</span> –{" "}
                    <span className="text-gray-200">{formatUsd(spark.max)}</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
              {spark.d ? (
                <svg viewBox="0 0 100 30" width="100%" height="112" style={{ display: "block" }}>
                  {/* soft glow */}
                  <path
                    d={spark.d}
                    fill="none"
                    stroke="rgba(255,255,255,0.20)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* main line */}
                  <path
                    d={spark.d}
                    fill="none"
                    stroke={trendUp ? "rgba(167, 243, 208, 0.95)" : "rgba(251, 113, 133, 0.95)"}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <div className="text-sm text-gray-500">Chart unavailable.</div>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Lightweight MVP chart (fast + reliable). We can upgrade to interactive charts later.
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur p-5">
            <div className="text-gray-300 text-sm mb-3">Market overview</div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <Row k="Market cap" v={formatUsdCompact(md.market_cap?.usd)} />
              <Row k="24h volume" v={formatUsdCompact(md.total_volume?.usd)} />
              <Row k="FDV" v={formatUsdCompact(md.fully_diluted_valuation?.usd)} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur p-5">
            <div className="text-gray-300 text-sm mb-3">Supply</div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <Row k="Circulating" v={formatNumber(md.circulating_supply)} />
              <Row k="Total" v={formatNumber(md.total_supply)} />
              <Row k="Max" v={formatNumber(md.max_supply)} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur p-5 md:col-span-2">
            <div className="text-gray-300 text-sm mb-3">All-time stats</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <Row
                k="ATH"
                v={md.ath?.usd ? `${formatUsd(md.ath?.usd)} (${safeDate(md.ath_date?.usd)})` : "—"}
              />
              <Row
                k="ATL"
                v={md.atl?.usd ? `${formatUsd(md.atl?.usd)} (${safeDate(md.atl_date?.usd)})` : "—"}
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        {coin.categories && coin.categories.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur p-5">
            <div className="text-gray-300 text-sm mb-3">Categories</div>
            <div className="flex flex-wrap gap-2">
              {coin.categories.slice(0, 16).map((c) => (
                <span
                  key={c}
                  className="text-xs rounded-full px-3 py-1 border border-white/10 bg-white/5 text-gray-100"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Links */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur p-5">
          <div className="text-gray-300 text-sm mb-3">Official links</div>
          <div className="flex flex-wrap gap-3 text-sm">
            {website ? (
              <a className="text-amber-200 underline" href={website} target="_blank" rel="noreferrer">
                Website
              </a>
            ) : null}
            {explorer ? (
              <a className="text-amber-200 underline" href={explorer} target="_blank" rel="noreferrer">
                Explorer
              </a>
            ) : null}
            {twitter ? (
              <a className="text-amber-200 underline" href={twitter} target="_blank" rel="noreferrer">
                X / Twitter
              </a>
            ) : null}
            {reddit ? (
              <a className="text-amber-200 underline" href={reddit} target="_blank" rel="noreferrer">
                Reddit
              </a>
            ) : null}
            {github ? (
              <a className="text-amber-200 underline" href={github} target="_blank" rel="noreferrer">
                GitHub
              </a>
            ) : null}
            {!website && !explorer && !twitter && !reddit && !github ? (
              <span className="text-gray-500">No public links available.</span>
            ) : null}
          </div>
        </div>

        {/* Reddit feed */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur p-5">
          <div className="flex items-center justify-between gap-4">
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
              {redditPosts.slice(0, 10).map((p, idx) => (
                <li key={idx} className="text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-100 hover:underline leading-snug"
                    >
                      {p.title}
                    </a>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {p.updated ? safeDateTime(p.updated) : "—"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Source: {p.sourceLabel}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Updates (CoinGecko status updates) */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur p-5">
          <div className="text-gray-300 text-sm mb-3">Updates</div>
          {updates.length === 0 ? (
            <div className="text-gray-500 text-sm">No recent updates available.</div>
          ) : (
            <ul className="space-y-3">
              {updates.slice(0, 6).map((u, idx) => (
                <li key={idx} className="text-sm">
                  <div className="text-gray-300">
                    <span className="text-gray-500">
                      {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                    </span>
                    {u.category ? <span className="text-gray-500"> • {u.category}</span> : null}
                  </div>
                  <div className="text-gray-100 mt-1">
                    {(u.description ?? "").slice(0, 260)}
                    {(u.description ?? "").length > 260 ? "…" : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10 text-xs text-gray-500">Data sources: CoinGecko + Reddit RSS</div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-gray-400">{k}</span>
      <span className="text-gray-100 text-right">{v}</span>
    </div>
  );
}
