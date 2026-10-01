"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CheckinResponse, Language, PublishedReel } from "@/lib/types";
import { checkin } from "@/lib/checkin";
import { speechUrl } from "@/lib/tts";
import { saveReel } from "@/lib/storage";
import { LANGUAGES, speechLangFor } from "@/lib/languages";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import VoiceOrb from "@/components/VoiceButton";
import BottomNav from "@/components/BottomNav";

type Status = "idle" | "processing" | "response" | "prayer";

const FEELINGS: { label: string; text: string }[] = [
  { label: "Anxious", text: "I'm feeling anxious." },
  { label: "Lonely", text: "I'm feeling lonely." },
  { label: "Sad", text: "I'm feeling sad." },
  { label: "I don't know", text: "I'm not sure how I'm feeling." },
];

export default function CheckInPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showType, setShowType] = useState(false);
  const [typed, setTyped] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const submit = useCallback(async (text: string, lang: Language) => {
    const t = text.trim();
    if (!t) return;
    setStatus("processing");
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const r = await checkin(t, lang);
      setResult(r);
      setStatus("response");
    } catch (e) {
      setError((e as Error).message);
      setStatus("idle");
    }
  }, []);

  const { supported, listening, interim, start, stop } = useSpeechRecognition({
    lang: speechLangFor(language),
    onResult: (t) => submit(t, language),
  });

  const stopSpeech = useCallback(() => {
    audioRef.current?.pause();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speakText = useCallback((text: string, lang: string) => {
    const t = text.trim();
    if (!t) return;
    const audio = audioRef.current ?? (audioRef.current = new Audio());
    const fallback = () => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setSpeaking(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(t);
      u.lang = speechLangFor((["en", "hi", "kn"].includes(lang) ? lang : "en") as Language);
      u.rate = 0.9;
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setSpeaking(true);
    };
    audio.onplay = () => setSpeaking(true);
    audio.onended = () => setSpeaking(false);
    audio.onerror = fallback;
    audio.src = speechUrl(t, lang);
    audio.play().catch(fallback);
  }, []);

  // The orb answers aloud; the prayer is read when opened.
  useEffect(() => {
    let speech: string | null = null;
    if (status === "response" && result?.status === "ok" && result.verseText) {
      speech = [result.hook, result.verseText, result.reflection, "Would you like a prayer for this?"]
        .filter(Boolean)
        .join(" ");
    } else if (status === "prayer" && result?.prayer) {
      speech = result.prayer;
    }
    if (speech) speakText(speech, result?.language ?? language);
    return () => stopSpeech();
  }, [status, result, language, speakText, stopSpeech]);

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  const onOrb = () => {
    if (listening) {
      stop();
      return;
    }
    stopSpeech();
    if (!supported) {
      setShowType(true);
      setError("Voice isn't available on this device — please type below.");
      return;
    }
    setError(null);
    start();
  };

  const reset = () => {
    stopSpeech();
    setResult(null);
    setError(null);
    setSaved(false);
    setTyped("");
    setShowType(false);
    setStatus("idle");
  };

  const onSave = async () => {
    if (!result) return;
    const reel: PublishedReel = {
      id: `checkin-${Date.now()}`,
      kind: "emotion",
      emotionTags: result.emotion ? [result.emotion] : [],
      title: result.title ?? "For you",
      verseRange: result.verseRange ?? "",
      verseText: result.verseText ?? "",
      verseIds: [],
      hook: result.hook ?? "",
      reflection: result.reflection ?? "",
      prayer: result.prayer ?? "",
    };
    await saveReel(reel);
    setSaved(true);
  };

  const onListen = () => {
    if (!result?.prayer) return;
    if (speaking) {
      stopSpeech();
      return;
    }
    speakText(result.prayer, result.language ?? language);
  };

  const yesPrayer = () => {
    stopSpeech();
    setStatus("prayer");
  };

  const notNow = () => {
    stopSpeech();
    setResult(null);
    setStatus("idle");
  };

  return (
    <main className="checkin">
      <div className="cx-bg" aria-hidden />

      {status === "response" && result && result.status === "crisis" && result.crisis ? (
        <section className="cx-state cx-convo-state">
          <h1 className="cx-headline">{result.crisis.title}</h1>
          <p className="cx-gentle" style={{ whiteSpace: "pre-line" }}>
            {result.crisis.message}
          </p>
          <div className="cx-divider" />
          {result.crisis.resources.map((r) => (
            <p key={r.name} className="cx-gentle">
              <strong style={{ color: "var(--text)" }}>{r.name}</strong>
              <span style={{ color: "var(--muted)" }}> — {r.contact}</span>
              {r.hours && <span style={{ color: "var(--muted)" }}> ({r.hours})</span>}
            </p>
          ))}
          <p className="cx-gentle" style={{ marginTop: "1rem", fontWeight: 600 }}>
            {result.crisis.action}
          </p>
          <div className="cx-ask-actions">
            <button className="cx-no" onClick={reset}>
              Try again
            </button>
          </div>
        </section>
      ) : status === "response" && result && result.verseText ? (
        <section className="cx-state cx-convo-state">
          <VoiceOrb speaking={speaking} />
          <p className="cx-said">{result.hook}</p>
          <blockquote className="cx-verse cx-verse--center">{result.verseText}</blockquote>
          <p className="cx-ref">{result.verseRange}</p>
          {result.reflection && <p className="cx-gentle">{result.reflection}</p>}

          <div className="cx-ask">
            <p className="cx-ask-q">Would you like a prayer for this?</p>
            <div className="cx-ask-actions">
              <button className="cx-yes" onClick={yesPrayer}>
                Yes
              </button>
              <button className="cx-no" onClick={notNow}>
                Not now
              </button>
            </div>
          </div>
        </section>
      ) : status === "prayer" && result?.prayer ? (
        <section className="cx-state cx-convo-state">
          <VoiceOrb speaking={speaking} />
          <h1 className="cx-headline">A Prayer for You</h1>
          <p className="cx-prayer">{result.prayer}</p>
          <button className="cx-listen" onClick={onListen}>
            {speaking ? "Stop" : "Listen"}
          </button>
          <div className="cx-ask-actions">
            <button className="cx-no" onClick={onSave}>
              {saved ? "Saved" : "Save"}
            </button>
            <button className="cx-no" onClick={reset}>
              Done
            </button>
          </div>
        </section>
      ) : status === "processing" ? (
        <section className="cx-state cx-center">
          <VoiceOrb processing />
          <h1 className="cx-processing-title">Finding something for you…</h1>
          <p className="cx-processing-sub">A verse and a prayer to encourage you.</p>
        </section>
      ) : listening ? (
        <section className="cx-state cx-listening">
          <div className="cx-center">
            <VoiceOrb listening onClick={onOrb} />
            <p className="cx-listening-label">Listening…</p>
            {interim && <p className="cx-interim">&ldquo;{interim}&rdquo;</p>}
          </div>
          <button className="cx-finish" onClick={stop}>
            Tap to finish
          </button>
        </section>
      ) : (
        <section className="cx-state cx-idle">
          <header className="cx-topbar">
            <span className="cx-brand">Still Waters</span>
            <div className="cx-langs" aria-label="Language">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className="cx-lang"
                  data-active={language === l.code}
                  onClick={() => setLanguage(l.code)}
                  type="button"
                >
                  {l.label}
                </button>
              ))}
            </div>
          </header>

          <div className="cx-center">
            <VoiceOrb onClick={onOrb} />
            <h1 className="cx-question">What&apos;s on your heart today?</h1>
            <p className="cx-hint">Tap to speak</p>
          </div>

          {error && <p className="cx-error">{error}</p>}

          {showType ? (
            <div className="cx-type">
              <input
                className="cx-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="A few words about how you feel…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit(typed, language);
                }}
              />
              <button className="cx-quiet" onClick={() => submit(typed, language)}>
                Send
              </button>
            </div>
          ) : (
            <div className="cx-feelings">
              <span className="cx-feelings-label">or choose how you&apos;re feeling</span>
              <div className="cx-chips">
                {FEELINGS.map((f) => (
                  <button key={f.label} className="cx-chip" onClick={() => submit(f.text, language)}>
                    {f.label}
                  </button>
                ))}
              </div>
              <button className="cx-quiet" style={{ marginTop: "0.4rem" }} onClick={() => setShowType(true)}>
                or type it out
              </button>
            </div>
          )}
        </section>
      )}

      <BottomNav />
    </main>
  );
}
