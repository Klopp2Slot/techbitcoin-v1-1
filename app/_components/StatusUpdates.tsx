"use client";

import { useEffect, useState } from "react";

type Update = {
  description: string;
  category: string;
  created_at: string;
  user: string | null;
  user_title: string | null;
  pin: boolean;
};

export default function StatusUpdates({ coinId }: { coinId: string }) {
  const [items, setItems] = useState<Update[] | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/coin/${coinId}/status-updates`, { cache: "no-store" });
      const json = await res.json();
      setItems(json.data ?? []);
    }
    load();
  }, [coinId]);

  if (items === null) return <div className="small" style={{ padding: "0 14px 14px" }}>Loading updates…</div>;
  if (items.length === 0) return <div className="small" style={{ padding: "0 14px 14px" }}>No recent updates available.</div>;

  return (
    <div style={{ padding: "0 14px 14px" }}>
      <div className="small" style={{ marginBottom: 10, color: "rgba(233,233,233,0.75)" }}>Recent updates</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((u, idx) => (
          <li key={idx} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 14 }}>{u.description}</div>
            <div className="small" style={{ marginTop: 4 }}>
              {new Date(u.created_at).toLocaleString()} · {u.category}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
