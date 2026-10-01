"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import type { PublishedReel } from "@/lib/types";
import { colorsFor, EMOTION_MAP } from "@/lib/emotions";
import { isSaved, saveReel, unsaveReel } from "@/lib/storage";
import {
  BookmarkFilledIcon,
  BookmarkIcon,
  ChevronDownIcon,
  MoreIcon,
  ShareIcon,
} from "./Icons";

export default function ReelCard({ reel }: { reel: PublishedReel }) {
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const slideRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const playingRef = useRef(false);

  useEffect(() => {
    isSaved(reel.id).then(setSaved);
  }, [reel.id]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      videoRef.current?.pause();
      window.speechSynthesis?.cancel();
    },
    []
  );

  const getAudio = useCallback(() => {
    if (!reel.audio) return null;
    if (!audioRef.current) audioRef.current = new Audio(reel.audio);
    return audioRef.current;
  }, [reel.audio]);

  const playMedia = useCallback(
    (withSound: boolean) => {
      const target = videoRef.current ?? getAudio();
      if (!target) return;
      target.muted = !withSound;
      target.currentTime = 0;
      const p = target.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Autoplay-with-sound was blocked: play muted and unlock on first gesture.
          if (withSound) {
            target.muted = true;
            target.play().catch(() => {});
          }
        });
      }
    },
    [getAudio]
  );

  const stopMedia = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (v) {
      v.pause();
      v.muted = true;
    }
    if (a) {
      a.pause();
      a.muted = true;
    }
    window.speechSynthesis?.cancel();
  }, []);

  // Tap anywhere on the reel to play/pause it (ignoring the control buttons).
  const togglePlayback = useCallback(() => {
    if (playingRef.current) {
      stopMedia();
      playingRef.current = false;
    } else {
      playMedia(true);
      playingRef.current = true;
    }
  }, [playMedia, stopMedia]);

  const onSlideClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (el.closest("button, a, input, textarea, select, [role='button']")) return;
    togglePlayback();
  };

  // Autoplay this reel (with sound when the browser allows) while it is in view.
  useEffect(() => {
    const el = slideRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
            if (!reduce) {
              playMedia(true);
              playingRef.current = true;
            }
          } else {
            stopMedia();
            playingRef.current = false;
          }
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reel.id, playMedia, stopMedia]);

  // Unlock sound on the first user interaction (browsers block unmuted autoplay).
  useEffect(() => {
    const unlock = () => {
      if (!visibleRef.current) return;
      const target = videoRef.current ?? audioRef.current;
      if (!target || !target.muted) return;
      target.muted = false;
      target.play().catch(() => {});
    };
    const events = ["pointerdown", "touchstart", "wheel", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, []);

  const toggleSave = async () => {
    if (saved) {
      await unsaveReel(reel.id);
      setSaved(false);
    } else {
      await saveReel(reel);
      setSaved(true);
    }
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

  const isStory = reel.kind === "story";
  const label =
    reel.kind === "story" ? "Story" : reel.emotionTags.map((t) => EMOTION_MAP[t].label).join(" · ");
  const [c1, c2] = reel.kind === "story" ? ["#2f6aa0", "#0b1d33"] : colorsFor(reel.emotionTags);

  return (
    <div
      ref={slideRef}
      className="reel-slide"
      onClick={onSlideClick}
      style={{ ["--c1" as string]: c1, ["--c2" as string]: c2, color: "#fff" }}
    >
      {reel.video ? (
        <>
          <video
            ref={videoRef}
            className="reel-video"
            src={reel.video}
            muted
            loop
            playsInline
            preload="none"
          />
          <div className={`reel-scrim${isStory ? " reel-scrim--story" : ""}`} />
        </>
      ) : (
        <div className="aurora" />
      )}
      <div className="grain" />
      <div className="vignette" />

      <div className="reel-content flex h-full flex-col justify-between px-6 pt-16 pb-28">
        <div className="flex items-center justify-between">
          {!isStory && (
            <span className="glass eyebrow" style={{ padding: "0.35rem 0.85rem", borderRadius: 9999 }}>
              {label}
            </span>
          )}
          <a
            href={`mailto:report@stillwaters.app?subject=Report reel ${encodeURIComponent(reel.id)}`}
            aria-label="Report this reel"
            className="icon-btn"
            style={{ width: "2.4rem", height: "2.4rem", marginLeft: "auto" }}
          >
            <MoreIcon size={20} />
          </a>
        </div>

        {!isStory && (
          <div className="fade-up">
            <p className="display" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>
              {reel.hook}
            </p>
            {reel.narrative && (
              <p
                className="fade-up stagger-2"
                style={{ marginTop: "1rem", fontSize: "1.05rem", lineHeight: 1.55, textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}
              >
                {reel.narrative}
              </p>
            )}
            <p className="verse fade-up stagger-2" style={{ marginTop: reel.narrative ? "1.2rem" : "1.1rem", textShadow: "0 1px 10px rgba(0,0,0,0.3)" }}>
              {reel.verseText}
            </p>
            <p className="eyebrow fade-up stagger-3" style={{ marginTop: "0.9rem", opacity: 0.85 }}>
              {reel.verseRange}
            </p>
          </div>
        )}

        <div>
          {!isStory && expanded && (
            <div className="fade-up" style={{ marginBottom: "1.1rem" }}>
              <p style={{ fontSize: "1.02rem", lineHeight: 1.55, textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}>
                {reel.reflection}
              </p>
              <p className="prayer" style={{ marginTop: "0.9rem", color: "rgba(255,255,255,0.85)" }}>
                {reel.prayer}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            {!isStory && (
              <button className="btn-glass btn" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Close" : "Reflect"}
                {!expanded && <ChevronDownIcon size={18} />}
              </button>
            )}
            <div className="flex items-center gap-2" style={{ marginLeft: "auto" }}>
              <button className="icon-btn" data-active={saved} onClick={toggleSave} aria-label="Save">
                {saved ? <BookmarkFilledIcon size={20} /> : <BookmarkIcon size={20} />}
              </button>
              <button className="icon-btn" onClick={share} aria-label="Share">
                <ShareIcon size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
