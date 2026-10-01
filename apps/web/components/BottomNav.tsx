"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, HeartIcon, ReelsIcon, SettingsIcon } from "./Icons";

const ITEMS = [
  { href: "/feed", label: "Reels", Icon: ReelsIcon },
  { href: "/check-in", label: "Check-in", Icon: HeartIcon },
  { href: "/saved", label: "Saved", Icon: BookmarkIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
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
        padding: "0.4rem 0 calc(0.4rem + env(safe-area-inset-bottom))",
        background: "color-mix(in srgb, var(--surface) 82%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid var(--border)",
        zIndex: 50,
      }}
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.15rem",
              padding: "0.4rem 0.9rem",
              color: active ? "var(--accent)" : "var(--muted)",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
