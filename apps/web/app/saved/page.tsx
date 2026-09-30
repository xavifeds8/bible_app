"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublishedReel } from "@/lib/types";
import { getSavedReels, unsaveReel } from "@/lib/storage";
import BottomNav from "@/components/BottomNav";

export default function SavedPage() {
  const [reels, setReels] = useState<PublishedReel[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = () => getSavedReels().then((r) => { setReels(r); setLoaded(true); });

  useEffect(() => {
    reload();
  }, []);

  const remove = async (id: string) => {
    await unsaveReel(id);
    reload();
  };

  return (
    <main style={{ minHeight: "100dvh", padding: "1.5rem 1.25rem 6rem" }}>
      <h1 className="display" style={{ marginBottom: "1.25rem" }}>
        Saved
      </h1>

      {loaded && reels.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          Nothing saved yet. Tap <Link href="/feed" style={{ textDecoration: "underline" }}>Save</Link> on a reel to keep it here.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {reels.map((reel) => (
          <div key={reel.id} className="card" style={{ padding: "1.25rem" }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "1rem" }}>{reel.title}</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.2rem" }}>{reel.verseRange}</p>
              </div>
              <button
                onClick={() => remove(reel.id)}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.9rem" }}
              >
                Remove
              </button>
            </div>
            <p style={{ marginTop: "0.75rem", fontSize: "0.95rem", lineHeight: 1.5 }}>
              {reel.verseText.length > 220 ? reel.verseText.slice(0, 220) + "…" : reel.verseText}
            </p>
            <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "var(--muted)" }}>{reel.reflection}</p>
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
