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
      .then((r) => setReels(r))
      .catch((e) => setError((e as Error).message));
    recordVisit();
  }, []);

  const shown = useMemo(() => {
    if (tab === "stories") return stories(reels);
    return reels.filter((r) => r.kind === "emotion");
  }, [reels, tab]);

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
        <p>Could not load reels.</p>
        <p style={{ fontSize: "0.85rem" }}>{error}</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-center gap-2 pt-4">
        <button className="chip" data-active={tab === "comfort"} onClick={() => setTab("comfort")}>
          Comfort
        </button>
        <button className="chip" data-active={tab === "stories"} onClick={() => setTab("stories")}>
          Stories
        </button>
      </div>
      <div className="feed flex-1">
        {shown.map((reel) => (
          <ReelCard key={reel.id} reel={reel} />
        ))}
      </div>
    </div>
  );
}
