"use client";

// Client-side persistence for saved trends. In mock mode (no auth) we keep
// saved trend ids + notes in localStorage. When Supabase auth is wired up this
// is where reads/writes would move to the saved_trends table.

const KEY = "wavesight.saved_trends.v1";

export interface SavedEntry {
  trend_id: string;
  notes: string;
  created_at: string;
}

export function getSaved(): SavedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedEntry[]) : [];
  } catch {
    return [];
  }
}

export function isSaved(trendId: string): boolean {
  return getSaved().some((e) => e.trend_id === trendId);
}

function write(entries: SavedEntry[]) {
  window.localStorage.setItem(KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event("wavesight:saved-changed"));
}

export function toggleSaved(trendId: string): boolean {
  const entries = getSaved();
  const exists = entries.some((e) => e.trend_id === trendId);
  if (exists) {
    write(entries.filter((e) => e.trend_id !== trendId));
    return false;
  }
  write([
    { trend_id: trendId, notes: "", created_at: new Date().toISOString() },
    ...entries,
  ]);
  return true;
}

export function setNotes(trendId: string, notes: string) {
  const entries = getSaved();
  const next = entries.map((e) =>
    e.trend_id === trendId ? { ...e, notes } : e
  );
  write(next);
}

export function removeSaved(trendId: string) {
  write(getSaved().filter((e) => e.trend_id !== trendId));
}
