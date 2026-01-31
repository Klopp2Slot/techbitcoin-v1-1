"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { formatPct, formatUsd, formatUsdCompact } from "../_lib/format";

type Row = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap_rank: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h_in_currency: number | null;
};

type Payload = { data: Row[]; fetchedAt: string; stale: boolean };

export default function GainersLosersTable({ mode }: { mode: "gainers" | "losers" }) {
  const [payload, setPayload] = useState<Payload | null>(null);

  async function load() {
    const res = await fetch("/api/markets-all", { cache: "no-store" });
    const json = await res.json();
    setPayload(json);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    const all: Row[] = (payload?.data ?? []) as any;
    const sorted = all
      .filter((r) => typeof r.price_change_percentage_24h_in_currency === "number")
      .sort((a, b) => (b.price_change_percentage_24h_in_currency ?? -1e9) - (a.price_change_percentage_24h_in_currency ?? -1e9));

    const top = mode === "gainers" ? sorted.slice(0, 50) : sorted.slice(-50).reverse();
    return top;
  }, [payload, mode]);

  const updated = payload?.fetchedAt ? new Date(payload.fetchedAt).toLocaleTimeString() : "";

  return (
    <div className="card">
      <div className="toolbar">
        <div className="badge">
          <strong>{mode === "gainers" ? "Top Gainers" : "Top Losers"}</strong>{" "}
          <span className="small">24h change (from top 1000)</span>
        </div>
        <div className="badge">Updated {updated}{payload?.stale ? " (delayed)" : ""}</div>
      </div>

      <div className="table-wrap">
        <table className="table" aria-label="Gainers and losers table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>#</th>
              <th>Name</th>
              <th style={{ width: 160 }}>Price</th>
              <th style={{ width: 140 }}>Market Cap</th>
              <th style={{ width: 140 }}>24h Volume</th>
              <th style={{ width: 140 }}>24h</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = formatPct(r.price_change_percentage_24h_in_currency);
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
                  <td className="price">{formatUsdCompact(r.market_cap)}</td>
                  <td className="price">{formatUsdCompact(r.total_volume)}</td>
                  <td className={`pct ${p.cls}`}>{p.text}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "rgba(233,233,233,0.65)" }}>Loading…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
