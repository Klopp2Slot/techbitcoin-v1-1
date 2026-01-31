import { NextResponse } from "next/server";
import { cgGet } from "../../../_lib/coingecko";
import { getCache, setCache } from "../../../_lib/cache";

export const runtime = "nodejs";

type StatusUpdate = {
  description: string;
  category: string;
  created_at: string;
  user: string | null;
  user_title: string | null;
  pin: boolean;
};

type Payload = { data: StatusUpdate[]; fetchedAt: string; stale: boolean };

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const key = `status:${id}`;
  const ttlMs = 10 * 60_000;

  const cached = getCache<Payload>(key);
  const isFresh = cached && (Date.now() - cached.ts) < ttlMs;
  if (isFresh) return NextResponse.json(cached!.value, { headers: { "x-cache": "HIT" } });

  try {
    const res = await cgGet<{ status_updates: StatusUpdate[] }>(`/coins/${encodeURIComponent(id)}/status_updates`, {
      per_page: 10,
      page: 1,
    });
    const payload: Payload = { data: res.status_updates ?? [], fetchedAt: new Date().toISOString(), stale: false };
    setCache(key, payload);
    return NextResponse.json(payload, { headers: { "x-cache": "MISS" } });
  } catch {
    if (cached) return NextResponse.json({ ...cached.value, stale: true, fetchedAt: new Date().toISOString() }, { headers: { "x-cache": "STALE" } });
    return NextResponse.json({ error: "Status updates unavailable." }, { status: 503 });
  }
}
