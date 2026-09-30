"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/feed", label: "Reels" },
  { href: "/check-in", label: "Check-in" },
  { href: "/saved", label: "Saved" },
  { href: "/settings", label: "Settings" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        padding: "0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom))",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        zIndex: 50,
      }}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: active ? "var(--accent)" : "var(--muted)",
              padding: "0.4rem 0.75rem",
              borderRadius: 9999,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
