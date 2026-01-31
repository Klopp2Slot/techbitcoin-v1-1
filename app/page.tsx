import Link from "next/link";
import MarketsTable from "./_components/MarketsTable";

export default function Home() {
  return (
    <main className="container">
      <header className="hero">
        <h1 className="title">TechBitcoin</h1>
        <p className="subtitle">Live prices and market data powered by CoinGecko</p>
        <p className="small" style={{ marginTop: 12 }}>
          <Link href="/gainers">Gainers</Link> · <Link href="/losers">Losers</Link>
        </p>
      </header>

      <MarketsTable />

      <div className="footer">
        Data source: CoinGecko. This site is for informational purposes only and does not provide financial advice.
      </div>
    </main>
  );
}
