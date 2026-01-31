import Link from "next/link";
import GainersLosersTable from "../_components/GainersLosersTable";

export default function Page() {
  return (
    <main className="container">
      <div className="hero" style={{ paddingBottom: 10 }}>
        <h1 className="title" style={{ fontSize: 44, marginBottom: 6 }}>
          <Link href="/">TechBitcoin</Link>
        </h1>
        <p className="subtitle" style={{ marginTop: 0 }}>Top losers (24h)</p>
      </div>

      <GainersLosersTable mode="losers" />

      <div className="footer">
        <Link href="/gainers">← View gainers</Link>
      </div>
    </main>
  );
}
