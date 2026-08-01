"use client";

import type { ScanProfile } from "@/lib/fit";

// Persists the user's last scan so the dashboard shows their narrowed board
// instead of the whole library. Lives in localStorage for the MVP; moves to the
// user's profile once auth is wired up.

const KEY = "wavesight.last_scan.v1";

export interface SavedScan {
  profile: ScanProfile;
  hits: { trendId: string; fit: number; reasons: string[] }[];
  scanned: number;
  at: string;
}

export function getLastScan(): SavedScan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedScan) : null;
  } catch {
    return null;
  }
}

export function saveScan(scan: SavedScan) {
  window.localStorage.setItem(KEY, JSON.stringify(scan));
  window.dispatchEvent(new Event("wavesight:scan-changed"));
}

export function clearScan() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("wavesight:scan-changed"));
}
