"use client";

import { useState } from "react";
import type { CheckinResponse, EmotionTag, Language } from "@/lib/types";
import { EMOTION_MAP } from "@/lib/emotions";
import { checkin } from "@/lib/checkin";
import { LANGUAGES } from "@/lib/languages";
import EmotionPicker from "@/components/EmotionPicker";
import VoiceButton from "@/components/VoiceButton";
import BottomNav from "@/components/BottomNav";

export default function CheckInPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [emotion, setEmotion] = useState<EmotionTag>();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const speechLang = LANGUAGES.find((l) => l.code === language)?.speech ?? "en-IN";

  const submit = async (value?: string) => {
    const t = (value ?? text).trim();
    if (!t && !emotion) {
      setError("Choose a feeling or say a few words.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await checkin(t, language);
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onVoice = (transcript: string) => {
    setText(transcript);
    submit(transcript);
  };

  return (
    <main style={{ minHeight: "100dvh", padding: "1.5rem 1.25rem 6rem" }}>
      <h1 className="display" style={{ marginBottom: "1.25rem" }}>
        How are you feeling?
      </h1>

      <div className="flex gap-2" role="tablist" aria-label="Language">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            className="chip"
            data-active={language === l.code}
            onClick={() => setLanguage(l.code)}
            type="button"
          >
            {l.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <EmotionPicker selected={emotion} onSelect={setEmotion} />
      </div>

      <VoiceButton lang={speechLang} onResult={onVoice} disabled={loading} />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="…or type a few words"
        rows={3}
        style={{
          width: "100%",
          marginTop: "0.75rem",
          padding: "0.85rem",
          borderRadius: "0.75rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontSize: "1rem",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />

      {error && <p style={{ color: "#b91c1c", marginTop: "0.75rem", fontSize: "0.9rem" }}>{error}</p>}

      <button
        onClick={() => submit()}
        disabled={loading}
        className="btn btn-primary"
        style={{ width: "100%", marginTop: "1rem", opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "Finding a word for you…" : "Get comfort"}
      </button>

      {result?.status === "crisis" && result.crisis && (
        <CrisisView
          title={result.crisis.title}
          message={result.crisis.message}
          resources={result.crisis.resources}
          action={result.crisis.action}
        />
      )}

      {result?.status === "ok" && result.verseText && (
        <div className="card" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
            <span
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
                padding: "0.25rem 0.7rem",
                borderRadius: 9999,
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              {result.emotion ? EMOTION_MAP[result.emotion].label : "For you"}
            </span>
            {result.personalized && (
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>personalized</span>
            )}
          </div>

          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.25 }}>{result.hook}</h2>
          <p className="verse" style={{ marginTop: "1rem" }}>
            {result.verseText}
          </p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)" }}>
            {result.verseRange}
          </p>
          <p style={{ marginTop: "1rem", fontSize: "0.95rem", lineHeight: 1.55 }}>{result.reflection}</p>
          <p className="prayer" style={{ marginTop: "1rem" }}>
            {result.prayer}
          </p>

          <Feedback />
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function CrisisView({
  title,
  message,
  resources,
  action,
}: {
  title: string;
  message: string;
  resources: { name: string; contact: string; hours?: string }[];
  action: string;
}) {
  return (
    <div className="card" style={{ marginTop: "1.5rem", padding: "1.5rem", borderColor: "#f59e0b" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{title}</h2>
      <p style={{ marginTop: "0.75rem", fontSize: "0.95rem", lineHeight: 1.55, whiteSpace: "pre-line" }}>
        {message}
      </p>
      <ul style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem", padding: 0, listStyle: "none" }}>
        {resources.map((r) => (
          <li key={r.name} style={{ fontSize: "0.9rem" }}>
            <strong>{r.name}</strong>
            <span style={{ color: "var(--muted)" }}> — {r.contact}</span>
            {r.hours && <span style={{ color: "var(--muted)" }}> ({r.hours})</span>}
          </li>
        ))}
      </ul>
      <p style={{ marginTop: "1rem", fontSize: "0.9rem", fontWeight: 600 }}>{action}</p>
    </div>
  );
}

function Feedback() {
  const [sent, setSent] = useState<string | null>(null);
  if (sent) return <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.9rem" }}>{sent}</p>;
  return (
    <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.9rem", color: "var(--muted)" }}>
      <span>Was this helpful?</span>
      <button className="btn btn-ghost" style={{ padding: "0.4rem 1rem" }} onClick={() => setSent("Thank you.")}>
        Yes
      </button>
      <button className="btn btn-ghost" style={{ padding: "0.4rem 1rem" }} onClick={() => setSent("Thank you.")}>
        No
      </button>
    </div>
  );
}
