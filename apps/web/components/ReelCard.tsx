"use client";

import { useEffect, useRef, useState } from "react";
import type { PublishedReel } from "@/lib/types";
import { gradientFor, EMOTION_MAP } from "@/lib/emotions";
import { isSaved, saveReel, unsaveReel } from "@/lib/storage";

export default function ReelCard({ reel }: { reel: PublishedReel }) {
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    isSaved(reel.id).then(setSaved);
  }, [reel.id]);

  const toggleSave = async () => {
    if (saved) {
      await unsaveReel(reel.id);
      setSaved(false);
    } else {
      await saveReel(reel);
      setSaved(true);
    }
  };

  const speak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(reel.verseText);
    u.lang = "en-IN";
    u.rate = 0.88;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const share = async () => {
    const text = `${reel.title} — ${reel.verseRange}\n\n${reel.verseText}\n\n${reel.reflection}\n\n${reel.prayer}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: reel.title, text });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } catch {
      /* ignore */
    }
  };

  const label =
    reel.kind === "story" ? "Story" : reel.emotionTags.map((t) => EMOTION_MAP[t].label).join(" · ");

  return (
    <div
      className="reel-slide animate-bg flex flex-col justify-between overflow-hidden px-6 pt-6 pb-24"
      style={{ background: gradientFor(reel.emotionTags), color: "#f8fafc" }}
    >
      <div className="flex items-center justify-between">
        <span
          style={{
            background: "rgba(255,255,255,0.16)",
            padding: "0.3rem 0.8rem",
            borderRadius: 9999,
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <a
          href={`mailto:report@stillwaters.app?subject=Report reel ${encodeURIComponent(reel.id)}`}
          aria-label="Report this reel"
          style={{ fontSize: "1rem", opacity: 0.7 }}
        >
          ⋯
        </a>
      </div>

      <div className="fade-up space-y-4">
        <p className="display" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
          {reel.hook}
        </p>
        <div>
          <p className="verse" style={{ fontSize: "1.3rem" }}>
            {reel.verseText}
          </p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", opacity: 0.8, fontWeight: 600 }}>
            {reel.verseRange}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {expanded ? (
          <div className="fade-up space-y-4">
            <p style={{ fontSize: "1.05rem", lineHeight: 1.5, opacity: 0.95 }}>{reel.reflection}</p>
            <p className="prayer" style={{ color: "rgba(248,250,252,0.85)" }}>
              {reel.prayer}
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!shownRef.current) {
                shownRef.current = true;
                setExpanded(true);
              } else {
                setExpanded((v) => !v);
              }
            }}
            className="btn btn-primary"
          >
            {expanded ? "Close" : "Continue"}
          </button>
          <button onClick={speak} className="btn btn-ghost" style={{ color: "#f8fafc", borderColor: "rgba(255,255,255,0.4)" }}>
            {speaking ? "Stop" : "Listen"}
          </button>
          <button onClick={toggleSave} className="btn btn-ghost" style={{ color: "#f8fafc", borderColor: "rgba(255,255,255,0.4)" }}>
            {saved ? "Saved" : "Save"}
          </button>
          <button onClick={share} className="btn btn-ghost" style={{ color: "#f8fafc", borderColor: "rgba(255,255,255,0.4)" }}>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
