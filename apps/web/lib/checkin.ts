import type { CheckinResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export async function checkin(text: string, language: string = "en"): Promise<CheckinResponse> {
  const res = await fetch(`${API_BASE}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) throw new Error(`Check-in failed (${res.status})`);
  return res.json();
}
