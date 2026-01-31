# TechBitcoin V1 (stable CoinGecko-powered markets site)

A Next.js (App Router) site that replicates the *live 24/7* feel of CoinMarketCap/CoinGecko:
- Markets table (rank, name, price, 1h/24h/7d)
- Top 1000 coins (aggregated server-side)
- Pagination
- Coin detail page with a simple 7D chart
- **Server-side cache** so the UI never goes blank if CoinGecko rate-limits or hiccups
- Optional CoinGecko API key support

## Quick start (local)
1) Install Node.js 18+.
2) In this folder:
```bash
npm install
npm run dev
```
3) Open http://localhost:3000

## Deploy (recommended: Vercel)
1) Create a new Vercel project from this folder.
2) Set environment variables (optional but recommended):
   - `COINGECKO_API_KEY` (CoinGecko demo/pro key)
3) Deploy.

## Environment variables
- `COINGECKO_API_KEY` (optional)
  The API routes will send it as `x-cg-demo-api-key`. If you have a Pro key and your plan requires
  a different header, update `app/api/_lib/coingecko.ts`.

## Notes
- UI refresh interval is 20 seconds.
- Server cache TTL is 20 seconds.
- If CoinGecko fails, the API returns the **last cached** response + `stale: true`.


## V1.1 additions
- Markets table now shows Market Cap + 24h Volume and lists 50 coins per page.
- Category filter dropdown (via CoinGecko category IDs).
- Gainers and Losers pages (24h).
- Coin pages expanded with market cap, FDV, supply, ATH/ATL, links, and CoinGecko status updates.
