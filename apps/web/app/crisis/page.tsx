import Link from "next/link";
import { CRISIS_TITLE, CRISIS_MESSAGE, CRISIS_RESOURCES, CRISIS_ACTION } from "@/lib/crisis";

export default function CrisisPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 className="display" style={{ marginBottom: "1rem" }}>
        {CRISIS_TITLE}
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 420, lineHeight: 1.6 }}>{CRISIS_MESSAGE}</p>

      <div className="card" style={{ marginTop: "1.5rem", padding: "1.5rem", width: "100%", maxWidth: 420, textAlign: "left" }}>
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: 0, listStyle: "none" }}>
          {CRISIS_RESOURCES.map((r) => (
            <li key={r.name} style={{ fontSize: "0.95rem" }}>
              <strong>{r.name}</strong>
              <span style={{ color: "var(--muted)" }}> — {r.contact}</span>
              {r.hours && <span style={{ color: "var(--muted)" }}> ({r.hours})</span>}
            </li>
          ))}
        </ul>
      </div>

      <p style={{ marginTop: "1.25rem", fontWeight: 600, maxWidth: 420 }}>{CRISIS_ACTION}</p>

      <Link href="/" className="btn btn-ghost" style={{ marginTop: "2rem" }}>
        Back home
      </Link>
    </main>
  );
}
