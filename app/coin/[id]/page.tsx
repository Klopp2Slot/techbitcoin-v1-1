import Image from "next/image";
import Link from "next/link";
import Sparkline from "../../_components/Sparkline";
import StatusUpdates from "../../_components/StatusUpdates";
import { formatNumber, formatPct, formatUsd, formatUsdCompact } from "../../_lib/format";

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

async function getCoin(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/coin/${id}`, { cache: "no-store" });
  return res.json() as Promise<{ data: Coin; stale: boolean; fetchedAt: string }>;
}

async function getChart(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/coin/${id}/chart?days=7`, { cache: "no-store" });
  return res.json() as Promise<{ data: { prices: [number, number][] }; stale: boolean; fetchedAt: string }>;
}

function firstNonEmpty(arr?: (string | null | undefined)[]) {
  if (!arr) return null;
  for (const x of arr) {
    if (x && x.trim()) return x.trim();
  }
  return null;
}

export default async function CoinPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [coinPayload, chartPayload] = await Promise.all([getCoin(id), getChart(id)]);

  const coin = coinPayload.data;
  const prices = chartPayload?.data?.prices?.map((p) => p[1]) ?? [];

  const p1 = formatPct(coin.market_data.price_change_percentage_1h_in_currency?.usd ?? null);
  const p24 = formatPct(coin.market_data.price_change_percentage_24h_in_currency?.usd ?? null);
  const p7 = formatPct(coin.market_data.price_change_percentage_7d_in_currency?.usd ?? null);

  const athDate = coin.market_data.ath_date?.usd ? new Date(coin.market_data.ath_date.usd).toLocaleDateString() : "—";
  const atlDate = coin.market_data.atl_date?.usd ? new Date(coin.market_data.atl_date.usd).toLocaleDateString() : "—";

  const homepage = firstNonEmpty(coin.links?.homepage);
  const explorer = firstNonEmpty(coin.links?.blockchain_site);
  const twitter = coin.links?.twitter_screen_name ? `https://twitter.com/${coin.links.twitter_screen_name}` : null;
  const reddit = coin.links?.subreddit_url || null;
  const github = firstNonEmpty(coin.links?.repos_url?.github);

  return (
    <main className="container">
      <div className="hero" style={{ paddingBottom: 10 }}>
        <h1 className="title" style={{ fontSize: 44, marginBottom: 6 }}>
          <Link href="/">TechBitcoin</Link>
        </h1>
        <p className="subtitle" style={{ marginTop: 0 }}>Coin detail</p>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="coin">
            <Image src={coin.image.small} alt={`${coin.name} logo`} width={28} height={28} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {coin.name} <span style={{ color: "rgba(233,233,233,0.65)" }}>({coin.symbol.toUpperCase()})</span>
              </div>
              <div className="small">
                Rank #{coin.market_data.market_cap_rank ?? "—"} · Updated {new Date(coinPayload.fetchedAt).toLocaleTimeString()}
                {coinPayload.stale || chartPayload.stale ? " (delayed)" : ""}
              </div>
              {coin.categories && coin.categories.length > 0 && (
                <div className="small" style={{ marginTop: 4, color: "rgba(233,233,233,0.7)" }}>
                  Categories: {coin.categories.slice(0, 5).join(" · ")}
                </div>
              )}
            </div>
          </div>
          <div className="small"><Link href="/">← Back to markets</Link></div>
        </div>

        <div className="kv">
          <div className="item">
            <div className="k">Price</div>
            <div className="v">{formatUsd(coin.market_data.current_price.usd)}</div>
          </div>
          <div className="item">
            <div className="k">1h</div>
            <div className={`v ${p1.cls}`}>{p1.text}</div>
          </div>
          <div className="item">
            <div className="k">24h</div>
            <div className={`v ${p24.cls}`}>{p24.text}</div>
          </div>
          <div className="item">
            <div className="k">7d</div>
            <div className={`v ${p7.cls}`}>{p7.text}</div>
          </div>
          <div className="item">
            <div className="k">Market cap</div>
            <div className="v">{formatUsdCompact(coin.market_data.market_cap.usd)}</div>
          </div>
          <div className="item">
            <div className="k">FDV</div>
            <div className="v">{formatUsdCompact(coin.market_data.fully_diluted_valuation?.usd ?? null)}</div>
          </div>
          <div className="item">
            <div className="k">24h volume</div>
            <div className="v">{formatUsdCompact(coin.market_data.total_volume.usd)}</div>
          </div>
          <div className="item">
            <div className="k">Circulating</div>
            <div className="v">{formatNumber(coin.market_data.circulating_supply ?? null)}</div>
          </div>
          <div className="item">
            <div className="k">Total supply</div>
            <div className="v">{formatNumber(coin.market_data.total_supply ?? null)}</div>
          </div>
          <div className="item">
            <div className="k">Max supply</div>
            <div className="v">{formatNumber(coin.market_data.max_supply ?? null)}</div>
          </div>
          <div className="item">
            <div className="k">ATH</div>
            <div className="v">{formatUsd(coin.market_data.ath.usd)} <span className="small">({athDate})</span></div>
          </div>
          <div className="item">
            <div className="k">ATL</div>
            <div className="v">{formatUsd(coin.market_data.atl.usd)} <span className="small">({atlDate})</span></div>
          </div>
        </div>

        <div className="chart">
          <Sparkline prices={prices} />
        </div>

        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="small" style={{ margin: "12px 0 8px", color: "rgba(233,233,233,0.75)" }}>Links</div>
          <div className="small" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {homepage && <a href={homepage} target="_blank" rel="noreferrer">Website</a>}
            {explorer && <a href={explorer} target="_blank" rel="noreferrer">Explorer</a>}
            {twitter && <a href={twitter} target="_blank" rel="noreferrer">X / Twitter</a>}
            {reddit && <a href={reddit} target="_blank" rel="noreferrer">Reddit</a>}
            {github && <a href={github} target="_blank" rel="noreferrer">GitHub</a>}
            {(!homepage && !explorer && !twitter && !reddit && !github) && <span>No links available.</span>}
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <StatusUpdates coinId={coin.id} />
        </div>
      </div>

      <div className="footer">
        Data source: CoinGecko. Informational only.
      </div>
    </main>
  );
}
