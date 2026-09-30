import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: "2rem", maxWidth: 640, margin: "0 auto" }}>
      <h1 className="display" style={{ marginBottom: "1.25rem" }}>
        Privacy
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", lineHeight: 1.6, fontSize: "0.95rem" }}>
        <p>
          <strong>We do not store what you write.</strong> Your check-in words are used only to find a
          suitable verse and are never saved, logged, or shared.
        </p>
        <p>
          <strong>Every verse is from a verified Bible.</strong> Scripture comes from a public-domain
          translation database (World English Bible / King James Version). AI helps find and reflect, but
          never writes scripture.
        </p>
        <p>
          <strong>If you are in distress,</strong> we show you a static support screen with helplines. We
          record only the category (not your words) so we can improve our safety systems.
        </p>
        <p>
          <strong>Saved items and your streak</strong> are stored on your device (IndexedDB). Clearing your
          browser data resets them.
        </p>
      </div>
      <Link href="/" className="btn btn-ghost" style={{ marginTop: "2rem" }}>
        Back home
      </Link>
    </main>
  );
}
