const BASE = "https://api.coingecko.com/api/v3";

function headers(): HeadersInit {
  const h: Record<string, string> = { "accept": "application/json" };
  const key = process.env.COINGECKO_API_KEY?.trim();
  if (key) h["x-cg-demo-api-key"] = key; // adjust if your plan requires a different header
  return h;
}

export async function cgGet<T>(path: string, searchParams?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(BASE + path);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers(), cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`CoinGecko error ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}
