import Link from "next/link";

export default function Landing() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div>
        <h1 className="display" style={{ fontSize: "2.25rem" }}>
          Still Waters
        </h1>
        <p style={{ color: "var(--muted)", marginTop: "0.5rem", fontSize: "1.05rem" }}>
          Short Bible reels, comfort, and prayer — wherever you are.
        </p>
      </div>

      <Link href="/feed" className="btn btn-primary" style={{ fontSize: "1.1rem", padding: "0.9rem 2.5rem" }}>
        Open app
      </Link>

      <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: "1rem", textAlign: "left" }}>
        <Feature
          title="Swipe through reels"
          body="One verse, one short reflection, one prayer at a time — for the way you feel right now."
        />
        <Feature
          title="Tell us how you are"
          body="A quick check-in returns a verse, a gentle reflection, and a prayer."
        />
        <Feature
          title="Your words stay yours"
          body="We never store what you write. Every verse comes from a verified Bible."
        />
      </div>

      <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
        <Link href="/privacy" style={{ color: "var(--muted)", textDecoration: "underline" }}>
          Privacy
        </Link>
        <Link href="/crisis" style={{ color: "var(--muted)", textDecoration: "underline" }}>
          Need help now?
        </Link>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>{title}</h2>
      <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginTop: "0.2rem" }}>{body}</p>
    </div>
  );
}
