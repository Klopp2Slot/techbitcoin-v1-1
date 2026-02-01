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

function pctClass(v?: number) {
  if (typeof v !== "number") return "text-gray-400";
  return v >= 0 ? "text-green-400" : "text-red-400";
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
  // CoinGecko provides status updates via: /coins/{id}/status_updates
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    id
  )}/status_updates?per_page=10&page=1`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json?.status_updates ?? []) as StatusUpdate[];
}

export default async function CoinPage({ params }: { params: { id: string } }) {
  const id = params?.id;

  if (!id) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Coin not found</h1>
        <p className="text-gray-400 mt-2">Missing coin id in the URL.</p>
        <Link href="/" className="text-green-400 underline mt-4 inline-block">
          ← Back to markets
        </Link>
      </div>
    );
  }

  const [coin, updates] = await Promise.all([fetchCoin(id), fetchStatusUpdates(id)]);

  if (!coin || !coin.market_data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Coin data unavailable</h1>
        <p className="text-gray-400 mt-2">
          This asset didn’t return full market data from CoinGecko right now.
        </p>
        <Link href="/" className="text-green-400 underline mt-4 inline-block">
          ← Back to markets
        </Link>
      </div>
    );
  }

  const md = coin.market_data;
  const website = safeFirst(coin.links?.homepage);
  const explorer = safeFirst(coin.links?.blockchain_site?.filter(Boolean) as string[] | undefined);
  const reddit = coin.links?.subreddit_url ?? undefined;
  const github = safeFirst(coin.links?.repos_url?.github);
  const twitter =
    coin.links?.twitter_screen_name
      ? `https://x.com/${coin.links.twitter_screen_name}`
      : undefined;

  const p1h = md.price_change_percentage_1h_in_currency?.usd;
  const p24h = md.price_change_percentage_24h;
  const p7d = md.price_change_percentage_7d;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-green-400 underline">
          ← Back to markets
        </Link>
      </div>

      <div className="mt-5 flex items-center gap-3">
        {coin.image?.small ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coin.image.small} alt={`${coin.name} logo`} className="w-8 h-8 rounded-full" />
        ) : null}
        <h1 className="text-3xl font-bold">
          {coin.name} <span className="text-gray-400">({coin.symbol?.toUpperCase()})</span>
        </h1>
      </div>

      <div className="mt-2 text-gray-400">
        Rank: <span className="text-gray-200">#{coin.market_cap_rank ?? "—"}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 p-4">
          <div className="text-gray-400 text-sm">Price</div>
          <div className="text-2xl font-semibold">{formatUsd(md.current_price?.usd)}</div>
          <div className="mt-2 flex gap-4 text-sm">
<span className={pctClass(p1h)}>1h: {formatPct(p1h)?.text ?? "—"}</span>
<span className={pctClass(p24h)}>24h: {formatPct(p24h)?.text ?? "—"}</span>
<span className={pctClass(p7d)}>7d: {formatPct(p7d)?.text ?? "—"}</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <div className="text-gray-400 text-sm">Market overview</div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Market cap</span>
              <span>{formatUsdCompact(md.market_cap?.usd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">24h volume</span>
              <span>{formatUsdCompact(md.total_volume?.usd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">FDV</span>
              <span>{formatUsdCompact(md.fully_diluted_valuation?.usd)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <div className="text-gray-400 text-sm">Supply</div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Circulating</span>
              <span>{formatNumber(md.circulating_supply)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total</span>
              <span>{formatNumber(md.total_supply)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Max</span>
              <span>{formatNumber(md.max_supply)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <div className="text-gray-400 text-sm">All-time stats</div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">ATH</span>
              <span>
                {formatUsd(md.ath?.usd)}{" "}
                <span className="text-gray-500">({safeDate(md.ath_date?.usd)})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ATL</span>
              <span>
                {formatUsd(md.atl?.usd)}{" "}
                <span className="text-gray-500">({safeDate(md.atl_date?.usd)})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {coin.categories && coin.categories.length > 0 ? (
        <div className="mt-6">
          <div className="text-gray-400 text-sm mb-2">Categories</div>
          <div className="flex flex-wrap gap-2">
            {coin.categories.slice(0, 12).map((c) => (
              <span
                key={c}
                className="text-xs rounded-full border border-white/10 px-3 py-1 text-gray-200"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Links */}
      <div className="mt-8 rounded-xl border border-white/10 p-4">
        <div className="text-gray-400 text-sm mb-3">Official links</div>
        <div className="flex flex-wrap gap-3 text-sm">
          {website ? (
            <a className="text-green-400 underline" href={website} target="_blank" rel="noreferrer">
              Website
            </a>
          ) : null}
          {explorer ? (
            <a className="text-green-400 underline" href={explorer} target="_blank" rel="noreferrer">
              Explorer
            </a>
          ) : null}
          {twitter ? (
            <a className="text-green-400 underline" href={twitter} target="_blank" rel="noreferrer">
              X / Twitter
            </a>
          ) : null}
          {reddit ? (
            <a className="text-green-400 underline" href={reddit} target="_blank" rel="noreferrer">
              Reddit
            </a>
          ) : null}
          {github ? (
            <a className="text-green-400 underline" href={github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : null}
          {!website && !explorer && !twitter && !reddit && !github ? (
            <span className="text-gray-500">No public links available.</span>
          ) : null}
        </div>
      </div>

      {/* Updates / News */}
      <div className="mt-8 rounded-xl border border-white/10 p-4">
        <div className="text-gray-400 text-sm mb-3">Updates</div>
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
                <div className="text-gray-200 mt-1">
                  {(u.description ?? "").slice(0, 260)}
                  {(u.description ?? "").length > 260 ? "…" : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10 text-xs text-gray-500">
        Data source: CoinGecko (public endpoints)
      </div>
    </div>
  );
}
