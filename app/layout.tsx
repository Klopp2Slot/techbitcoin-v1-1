import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TechBitcoin — Live prices powered by CoinGecko",
  description: "Live crypto prices and market data powered by CoinGecko.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
