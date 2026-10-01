"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublishedReel } from "@/lib/types";
import { fetchReels, stories } from "@/lib/data";
import { recordVisit } from "@/lib/storage";
import ReelCard from "./ReelCard";

type Tab = "comfort" | "stories";

export default function Feed() {
  const [reels, setReels] = useState<PublishedReel[]>([]);
  const [tab, setTab] = useState<Tab>("comfort");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReels()
      .then(setReels)
      .catch((e) => setError((e as Error).message));
    recordVisit();
  }, []);

  const shown = useMemo(() => {
    // Review mode: only reels that have a rendered video.
    const withVideo = reels.filter((r) => r.video);
    return tab === "stories" ? stories(withVideo) : withVideo.filter((r) => r.kind === "emotion");
  }, [reels, tab]);

  if (error) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--muted)" }}>
        <p>Could not load reels.</p>
        <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>{error}</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100dvh" }}>
      <div className="feed">
        {shown.map((reel) => (
          <ReelCard key={reel.id} reel={reel} />
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top) + 0.7rem)",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 40,
          pointerEvents: "none",
        }}
      >
        <div className="glass" style={{ display: "flex", gap: "0.25rem", padding: "0.25rem", borderRadius: 9999 }}>
          {(["comfort", "stories"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                pointerEvents: "auto",
                border: "none",
                borderRadius: 9999,
                padding: "0.45rem 1.1rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                background: tab === t ? "rgba(255,255,255,0.92)" : "transparent",
                color: tab === t ? "#0b1220" : "rgba(255,255,255,0.9)",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
