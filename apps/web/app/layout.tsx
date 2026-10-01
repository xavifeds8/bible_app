import type { Metadata, Viewport } from "next";
import "./globals.css";
import { inter, lora } from "./fonts";
import ServiceWorker from "@/components/ServiceWorker";

const APP_NAME = "Still Waters";
const APP_DESC = "Short Bible reels, comfort, and prayer — wherever you are.";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESC,
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: APP_NAME },
};

export const viewport: Viewport = {
  themeColor: "#07131a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
