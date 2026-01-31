"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPct, formatUsd, formatUsdCompact } from "../_lib/format";

type Row = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap_rank: number;
  market_cap?: number;
  total_volume?: number;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
};

type TopPayload = {
  data: Row[];
  fetchedAt: string;
  stale: boolean;
  sourcePages?: number[];
};

type PagePayload = {
  data: Row[];
  page: number;
  per_page: number;
  category?: string;
  fetchedAt: string;
  stale: boolean;
};

const CATEGORY_PRESETS: { label: string; id: string }[] = [
  { label: "All (Top 1000)", id: "__top1000__" },
  { label: "Meme", id: "meme-token" },
  { label: "Layer 1", id: "layer-1" },
  { label: "Layer 2", id: "layer-2" },
  { label: "AI", id: "artificial-intelligence" },
  { label: "Gaming", id: "gaming" },
  { label: "RWA", id: "real-world-assets-rwa" },
  { label: "Stablecoins", id: "stablecoins" },
  { label: "DeFi", id: "decentralized-finance-defi" },
];

export default function MarketsTable() {
  const [category, setCategory] = useState<string>("__top1000__");
  const [page, setPage] = useState(1);
  const perPage = 50;

  const [topPayload, setTopPayload] = useState<TopPayload | null>(null);
  const [pagePayload, setPagePayload] = useState<PagePayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadTop() {
    setLoading(true);
    try {
      const res = await fetch(`/api/markets-all`, { cache: "no-store" });
      const json = await res.json();
      setTopPayload(json);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategory(cat: string, p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/markets?category=${encodeURIComponent(cat)}&page=${p}&per_page=${perPage}`, { cache: "no-store" });
      const json = await res.json();
      setPagePayload(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (category === "__top1000__") loadTop();
    else loadCategory(category, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (category === "__top1000__") loadTop();
      else loadCategory(category, page);
    }, 20_000);
    return () => clearInterval(t);
  }, [category, page]);

  useEffect(() => {
    setPage(1);
    setPagePayload(null);
    if (category === "__top1000__") loadTop();
    else loadCategory(category, 1);
  }, [category]);

  useEffect(() => {
    if (category !== "__top1000__") loadCategory(category, page);
  }, [page]);

  const isTop = category === "__top1000__";

  const rows: Row[] = useMemo(() => {
    if (isTop) {
      const all = topPayload?.data ?? [];
      const start = (page - 1) * perPage;
      const end = start + perPage;
      return all.slice(start, end);
    }
    return pagePayload?.data ?? [];
  }, [isTop, topPayload, pagePayload, page]);

  const totalPages = isTop ? Math.max(1, Math.ceil((topPayload?.data?.length ?? 0) / perPage)) : undefined;

  const updatedText = useMemo(() => {
    const ts = isTop ? topPayload?.fetchedAt : pagePayload?.fetchedAt;
    const stale = isTop ? topPayload?.stale : pagePayload?.stale;
    if (!ts) return "";
    const d = new Date(ts);
    return `Updated ${d.toLocaleTimeString()}` + (stale ? " (delayed)" : "");
  }, [isTop, topPayload?.fetchedAt, topPayload?.stale, pagePayload?.fetchedAt, pagePayload?.stale]);

  const pageButtons = useMemo(() => {
    if (!isTop) return [page];
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages!, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const arr = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }, [isTop, page, totalPages]);

  return (
    <div className="card">
      <div className="toolbar" style={{ gap: 12 }}>
        <div className="badge">
          <strong>{loading ? "Refreshing…" : "Live"}</strong>{" "}
          <span className="small">prices and market data powered by CoinGecko</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label className="small" htmlFor="cat">Category</label>
          <select
            id="cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              background: "rgba(0,0,0,0.35)",
              color: "rgba(233,233,233,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "8px 10px",
            }}
          >
            {CATEGORY_PRESETS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <div className="badge">{updatedText}</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table" aria-label="Crypto markets table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th>Name</th>
              <th style={{ width: 160 }}>Price</th>
              <th style={{ width: 140 }}>Market Cap</th>
              <th style={{ width: 140 }}>24h Volume</th>
              <th style={{ width: 110 }}>1h</th>
              <th style={{ width: 110 }}>24h</th>
              <th style={{ width: 110 }}>7d</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p1 = formatPct(r.price_change_percentage_1h_in_currency);
              const p24 = formatPct(r.price_change_percentage_24h_in_currency);
              const p7 = formatPct(r.price_change_percentage_7d_in_currency);

              return (
                <tr key={r.id}>
                  <td className="rank">{r.market_cap_rank ?? "—"}</td>
                  <td>
                    <Link href={`/coin/${r.id}`}>
                      <span className="coin">
                        <Image src={r.image} alt={`${r.name} logo`} width={28} height={28} />
                        <span>
                          <span className="name">{r.name}</span>{" "}
                          <span className="sym">({r.symbol.toUpperCase()})</span>
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="price">{formatUsd(r.current_price)}</td>
                  <td className="price">{formatUsdCompact((r as any).market_cap)}</td>
                  <td className="price">{formatUsdCompact((r as any).total_volume)}</td>
                  <td className={`pct ${p1.cls}`}>{p1.text}</td>
                  <td className={`pct ${p24.cls}`}>{p24.text}</td>
                  <td className={`pct ${p7.cls}`}>{p7.text}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "rgba(233,233,233,0.65)" }}>
                  Loading market data…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pager">
        {isTop ? (
          <>
            <a href="#" onClick={(e)=>{e.preventDefault(); setPage(1);}} className={page===1 ? "active": ""}>1</a>
            {page > 3 && <span className="small" style={{padding:"8px 0"}}>…</span>}
            {pageButtons.map((p) => (
              <a
                key={p}
                className={p === page ? "active" : ""}
                href="#"
                onClick={(e) => { e.preventDefault(); setPage(p); }}
              >
                {p}
              </a>
            ))}
            {totalPages && page < totalPages-2 && <span className="small" style={{padding:"8px 0"}}>…</span>}
            {totalPages && totalPages > 1 && (
              <a href="#" onClick={(e)=>{e.preventDefault(); setPage(totalPages);}} className={page===totalPages ? "active": ""}>
                {totalPages}
              </a>
            )}
          </>
        ) : (
          <span className="small">Page {page}</span>
        )}
        <a href="#" onClick={(e)=>{e.preventDefault(); setPage((x)=>Math.max(1, x-1));}}>‹ Prev</a>
        <a href="#" onClick={(e)=>{e.preventDefault(); setPage((x)=>x+1);}}>Next ›</a>
      </div>
    </div>
  );
}
