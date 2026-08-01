"use client";

import { useState } from "react";
import { Radar, ShieldCheck, Scale, Rocket } from "lucide-react";
import type { UserType } from "@/types";
import type { ScanProfile } from "@/lib/fit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const USER_TYPES: { value: UserType; label: string }[] = [
  { value: "creator", label: "Creator" },
  { value: "marketer", label: "Marketer" },
  { value: "agency", label: "Agency" },
  { value: "artist", label: "Artist" },
  { value: "brand", label: "Brand" },
];

const GOALS = [
  { value: "awareness", label: "Awareness" },
  { value: "engagement", label: "Engagement" },
  { value: "sales", label: "Sales" },
  { value: "music_promotion", label: "Music promotion" },
  { value: "community_growth", label: "Community growth" },
  { value: "campaign_idea", label: "Campaign idea" },
];

const PLATFORMS = [
  "TikTok",
  "Instagram",
  "YouTube",
  "Reddit",
  "LinkedIn",
  "Pinterest",
  "Substack",
];

const APPETITES: {
  value: ScanProfile["appetite"];
  label: string;
  hint: string;
  icon: typeof ShieldCheck;
}[] = [
  {
    value: "safe",
    label: "Play it safe",
    hint: "Brand-safe, low-risk, proven",
    icon: ShieldCheck,
  },
  {
    value: "balanced",
    label: "Balanced",
    hint: "A mix of safe and rising",
    icon: Scale,
  },
  {
    value: "bold",
    label: "Go early & bold",
    hint: "Low saturation, fast-moving",
    icon: Rocket,
  },
];

const DEFAULT: ScanProfile = {
  userType: "creator",
  niche: "",
  goal: "awareness",
  platforms: ["TikTok", "Instagram"],
  audience: "",
  appetite: "balanced",
  focus: "",
};

export function ScanIntake({
  initial,
  onSubmit,
}: {
  initial?: ScanProfile | null;
  onSubmit: (profile: ScanProfile) => void;
}) {
  const [p, setP] = useState<ScanProfile>(initial ?? DEFAULT);

  function togglePlatform(name: string) {
    setP((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(name)
        ? prev.platforms.filter((x) => x !== name)
        : [...prev.platforms, name],
    }));
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Radar className="size-5 text-primary-strong" />
          </span>
          <div>
            <h2 className="font-display text-xl">
              Tune your scan
            </h2>
            <p className="text-sm text-muted-foreground">
              We watch the whole internet — tell us what matters so we only
              surface the few trends worth your time.
            </p>
          </div>
        </div>

        {/* Identity */}
        <div className="space-y-2">
          <Label>I am a</Label>
          <div className="flex flex-wrap gap-2">
            {USER_TYPES.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => setP({ ...p, userType: u.value })}
                className={cn(
                  "rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                  p.userType === u.value
                    ? "border-primary/50 bg-primary/15 text-primary-strong"
                    : "border-border-strong text-muted-foreground hover:text-foreground"
                )}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="niche">My niche / what I make</Label>
            <Input
              id="niche"
              value={p.niche}
              onChange={(e) => setP({ ...p, niche: e.target.value })}
              placeholder="e.g. indie coffee brand, R&B artist…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal">My goal</Label>
            <Select
              id="goal"
              value={p.goal}
              onChange={(e) => setP({ ...p, goal: e.target.value })}
            >
              {GOALS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Platforms */}
        <div className="space-y-2">
          <Label>Platforms I care about</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((name) => {
              const on = p.platforms.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => togglePlatform(name)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    on
                      ? "border-primary/50 bg-primary/15 text-primary-strong"
                      : "border-border-strong text-muted-foreground hover:text-foreground"
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="audience">My audience (optional)</Label>
          <Input
            id="audience"
            value={p.audience}
            onChange={(e) => setP({ ...p, audience: e.target.value })}
            placeholder="e.g. women 22-35, remote workers, indie pop fans"
          />
        </div>

        {/* Appetite */}
        <div className="space-y-2">
          <Label>Risk appetite</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {APPETITES.map((a) => {
              const Icon = a.icon;
              const on = p.appetite === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setP({ ...p, appetite: a.value })}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                    on
                      ? "border-primary/50 bg-primary/10"
                      : "border-border-strong hover:border-border"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      on ? "text-primary-strong" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm font-medium">{a.label}</span>
                  <span className="text-xs text-faint">{a.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="focus">Anything specific you&apos;re hunting for? (optional)</Label>
          <Textarea
            id="focus"
            value={p.focus}
            onChange={(e) => setP({ ...p, focus: e.target.value })}
            placeholder="e.g. calm productivity aesthetics, sustainable fashion, a sound to ride…"
            className="min-h-[70px]"
          />
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={() => onSubmit(p)}
        >
          <Radar className="size-4" /> Run Live Scan
        </Button>
      </CardContent>
    </Card>
  );
}
