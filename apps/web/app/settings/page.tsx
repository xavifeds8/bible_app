"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStreak } from "@/lib/storage";
import BottomNav from "@/components/BottomNav";

export default function SettingsPage() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getStreak().then(setStreak);
  }, []);

  return (
    <main style={{ minHeight: "100dvh", padding: "1.5rem 1.25rem 6rem" }}>
      <h1 className="display" style={{ marginBottom: "1.25rem" }}>
        Settings
      </h1>

      <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
        <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Your streak</h2>
        <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>
          {streak} {streak === 1 ? "day" : "days"}
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem" }}>
          Streaks are stored on this device. Clearing your browser data will reset them.
        </p>
      </div>

      <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
        <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Daily verse</h2>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
          A daily verse with reminders is coming soon. Reminder channels (push / email / WhatsApp) will
          appear here.
        </p>
      </div>

      <div className="card" style={{ padding: "1.25rem" }}>
        <h2 style={{ fontWeight: 700, marginBottom: "0.75rem" }}>About</h2>
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: 0, listStyle: "none", fontSize: "0.95rem" }}>
          <li>
            <Link href="/privacy" style={{ color: "var(--accent)" }}>
              Privacy policy
            </Link>
          </li>
          <li>
            <Link href="/crisis" style={{ color: "var(--accent)" }}>
              Crisis support
            </Link>
          </li>
          <li>
            <a href="mailto:feedback@stillwaters.app" style={{ color: "var(--accent)" }}>
              Feedback
            </a>
          </li>
          <li>
            <a href="mailto:report@stillwaters.app" style={{ color: "var(--accent)" }}>
              Report a problem
            </a>
          </li>
        </ul>
      </div>

      <BottomNav />
    </main>
  );
}
