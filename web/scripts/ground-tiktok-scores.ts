// One-off: ground every library trend's creator-adoption WaveScore input in
// real TikTok hashtag stats, using the same pure modules the daily sync uses.
//   cd web && export $(grep -E 'SUPABASE_URL|SERVICE_ROLE' .env.local | xargs) \
//     && node --experimental-strip-types scripts/ground-tiktok-scores.ts
// The daily sync's capped 1c pass keeps this fresh afterwards; this script
// just avoids waiting a week for the cap to cover the backlog.

import { rescoreTrend } from "../src/lib/measured-scores.ts";
import { toHashtag } from "../src/lib/terms/hashtag.ts";
import type { Trend } from "../src/types/index.ts";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
async function hashtagUsers(tag: string): Promise<number | null> {
  const res = await fetch(
    `https://www.tikwm.com/api/challenge/info?challenge_name=${encodeURIComponent(tag)}`,
    { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`tikwm ${res.status}`);
  const body = (await res.json()) as any;
  if (body?.code === -1) return null;
  if (body?.code !== 0) throw new Error(`tikwm code ${body?.code}`);
  return Number(body.data?.user_count ?? 0);
}

const trends: Trend[] = await (
  await fetch(`${URL}/rest/v1/trends?select=*&order=created_at.desc`, {
    headers: HEADERS,
  })
).json();
console.log(`${trends.length} trends`);

let changed = 0;
let missed = 0;
for (const trend of trends) {
  const tag = toHashtag(trend.name);
  if (!tag) continue;
  let users: number | null = null;
  try {
    users = await hashtagUsers(tag);
  } catch (err) {
    console.error(`  ! ${trend.slug}: ${(err as Error).message} — skipping`);
    await new Promise((r) => setTimeout(r, 5000));
    continue;
  }
  if (users === null || users <= 0) {
    missed++;
  } else {
    const next = rescoreTrend(trend, { uniqueAuthors: users });
    if (next.wavescore !== trend.wavescore) {
      const res = await fetch(`${URL}/rest/v1/trends?id=eq.${trend.id}`, {
        method: "PATCH",
        headers: HEADERS,
        body: JSON.stringify({ wavescore: next.wavescore }),
      });
      if (!res.ok) console.error(`  ! patch failed ${trend.slug}: ${res.status}`);
      else {
        changed++;
        console.log(
          `  ${trend.slug}: #${tag} ${users.toLocaleString()} creators → wave ${trend.wavescore} → ${next.wavescore}`
        );
      }
    }
  }
  await new Promise((r) => setTimeout(r, 1300));
}
console.log(`done: ${changed} rescored, ${missed} no-hashtag, of ${trends.length}`);
