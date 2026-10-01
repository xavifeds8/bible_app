import Link from "next/link";

export default function Landing() {
  return (
    <main className="reel-slide" style={{ ["--c1" as string]: "#18b9a8", ["--c2" as string]: "#0a2a3a", color: "#fff" }}>
      <div className="aurora" />
      <div className="grain" />
      <div className="vignette" />

      <div
        className="reel-content"
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.75rem",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div className="fade-up">
          <p className="eyebrow" style={{ opacity: 0.75, marginBottom: "0.6rem" }}>
            Bible comfort
          </p>
          <h1 className="display" style={{ fontSize: "2.6rem" }}>
            Still Waters
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "1.05rem", opacity: 0.9, maxWidth: 360 }}>
            Short Bible reels, comfort, and prayer — wherever you are.
          </p>
        </div>

        <Link href="/feed" className="btn btn-primary fade-up stagger-1" style={{ fontSize: "1.05rem", padding: "0.9rem 2.5rem" }}>
          Open app
        </Link>

        <div className="fade-up stagger-2" style={{ display: "flex", flexDirection: "column", gap: "0.9rem", maxWidth: 380, textAlign: "left" }}>
          <Feature title="Swipe through reels" body="One verse, one reflection, one prayer at a time." />
          <Feature title="Say how you feel" body="Speak or tap — get a verse, a reflection, and a prayer in your language." />
          <Feature title="Your words stay yours" body="We never store what you write. Every verse comes from a verified Bible." />
        </div>

        <div className="fade-up stagger-3" style={{ display: "flex", gap: "1.25rem", fontSize: "0.85rem", opacity: 0.85 }}>
          <Link href="/privacy" style={{ textDecoration: "underline" }}>
            Privacy
          </Link>
          <Link href="/crisis" style={{ textDecoration: "underline" }}>
            Need help now?
          </Link>
        </div>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass" style={{ padding: "0.9rem 1rem", borderRadius: "1rem" }}>
      <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{title}</h2>
      <p style={{ fontSize: "0.85rem", marginTop: "0.2rem", opacity: 0.85 }}>{body}</p>
    </div>
  );
}
