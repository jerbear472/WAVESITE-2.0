"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Sparkles,
  Plus,
  AlertCircle,
  CheckCircle2,
  Layers,
  Link2,
} from "lucide-react";
import type { Signal, Trend } from "@/types";
import type { AnalyzeSignalResult } from "@/lib/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SignalCard } from "@/components/SignalCard";

const SOURCES = [
  "manual",
  "youtube",
  "tiktok",
  "reddit",
  "instagram",
  "article",
  "google_trends",
  "other",
];

interface Props {
  initialSignals: Signal[];
  trends: Trend[];
}

type Analysis = AnalyzeSignalResult & { _mock: boolean };

export function AdminImport({ initialSignals, trends }: Props) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [form, setForm] = useState({
    source: "manual",
    url: "",
    title: "",
    text: "",
    creator_name: "",
    engagement: "",
  });
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attachTrend, setAttachTrend] = useState(trends[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<
    | { type: "success" | "error"; message: string; href?: string; label?: string }
    | null
  >(null);

  function set<K extends keyof typeof form>(key: K, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function analyze() {
    setAnalyzing(true);
    setFormError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/ai/analyze-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.text,
          title: form.title,
          url: form.url,
          source: form.source,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setAnalysis(data.analysis);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function addSignal() {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          detected_phrases: analysis?.detected_phrases,
          detected_entities: analysis?.detected_entities,
          detected_emotions: analysis?.detected_emotions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save signal.");
      setSignals((s) => [data.signal, ...s]);
      setForm({
        source: "manual",
        url: "",
        title: "",
        text: "",
        creator_name: "",
        engagement: "",
      });
      setAnalysis(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save signal.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createTrend() {
    if (selected.size === 0) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ai/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create trend.");
      setNotice({
        type: "success",
        message: `Created trend "${data.trend.name}"${data.mock ? " (mock AI)" : ""}.`,
        href: `/trends/${data.trend.slug}`,
        label: "View trend",
      });
      setSelected(new Set());
    } catch (e) {
      setNotice({
        type: "error",
        message: e instanceof Error ? e.message : "Could not create trend.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function attach() {
    if (selected.size === 0 || !attachTrend) return;
    setBusy(true);
    setNotice(null);
    try {
      for (const signalId of selected) {
        const res = await fetch("/api/trend-signals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signalId, trendId: attachTrend }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Attach failed.");
        }
      }
      const t = trends.find((x) => x.id === attachTrend);
      setNotice({
        type: "success",
        message: `Attached ${selected.size} signal(s) to "${t?.name}".`,
        href: t ? `/trends/${t.slug}` : undefined,
        label: "View trend",
      });
      setSelected(new Set());
    } catch (e) {
      setNotice({
        type: "error",
        message: e instanceof Error ? e.message : "Attach failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: create + analyze */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add a signal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="source">Source</Label>
                <Select
                  id="source"
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creator">Creator</Label>
                <Input
                  id="creator"
                  value={form.creator_name}
                  onChange={(e) => set("creator_name", e.target.value)}
                  placeholder="@handle or name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Post title / video title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="text">Text / caption / comments</Label>
              <Textarea
                id="text"
                value={form.text}
                onChange={(e) => set("text", e.target.value)}
                placeholder="Paste the caption, transcript, or top comments…"
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="engagement">Engagement JSON (optional)</Label>
              <Input
                id="engagement"
                value={form.engagement}
                onChange={(e) => set("engagement", e.target.value)}
                placeholder='{"views": 1200000, "likes": 210000}'
                className="font-mono text-xs"
              />
            </div>

            {formError ? (
              <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertCircle className="size-4 shrink-0" />
                {formError}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={analyze}
                disabled={analyzing || !form.text}
                className="flex-1"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Analyze with AI
                  </>
                )}
              </Button>
              <Button
                onClick={addSignal}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Add Signal
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {analysis ? (
          <Card className="border-primary/30">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary-strong" /> AI analysis
              </CardTitle>
              <Badge variant={analysis._mock ? "warning" : "success"}>
                {analysis._mock ? "Mock AI" : "Claude"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Sentiment">
                {analysis.sentiment} · {analysis.sentiment_score}
              </Row>
              <Row label="Category">{analysis.category}</Row>
              <Row label="Audience">{analysis.audience}</Row>
              <TagRow label="Phrases" items={analysis.detected_phrases} />
              <TagRow label="Entities" items={analysis.detected_entities} />
              <TagRow label="Emotions" items={analysis.detected_emotions} />
              <TagRow
                label="Possible trends"
                items={analysis.possible_trend_names}
                variant="primary"
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Why it matters
                </p>
                <p className="mt-1 text-foreground/90">
                  {analysis.why_this_might_matter}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Risk notes
                </p>
                <p className="mt-1 text-foreground/90">{analysis.risk_notes}</p>
              </div>
              <p className="text-xs text-faint">
                Detected tags will be saved with the signal when you click “Add
                Signal”.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Right: signal library + actions */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Signal library</CardTitle>
            <span className="text-sm text-muted-foreground">
              {selected.size} selected
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Cluster selected signals
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={createTrend}
                  disabled={busy || selected.size === 0}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Layers className="size-3.5" />
                  )}
                  Create trend from signals
                </Button>
                <div className="flex items-center gap-1.5">
                  <Select
                    value={attachTrend}
                    onChange={(e) => setAttachTrend(e.target.value)}
                    className="h-8 w-44 text-xs"
                    aria-label="Trend to attach to"
                  >
                    {trends.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={attach}
                    disabled={busy || selected.size === 0}
                  >
                    <Link2 className="size-3.5" /> Attach
                  </Button>
                </div>
              </div>
              {notice ? (
                <div
                  className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    notice.type === "success"
                      ? "border border-success/30 bg-success/10 text-success"
                      : "border border-danger/30 bg-danger/10 text-danger"
                  }`}
                >
                  {notice.type === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0" />
                  )}
                  <span className="flex-1">{notice.message}</span>
                  {notice.href ? (
                    <Link
                      href={notice.href}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      {notice.label}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            {signals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No signals yet. Add one on the left to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {signals.map((s) => {
                  const isSel = selected.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={`block w-full rounded-lg text-left transition-all ${
                        isSel ? "ring-2 ring-primary/60" : "ring-1 ring-transparent"
                      }`}
                    >
                      <SignalCard signal={s} />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-foreground/90">{children}</span>
    </div>
  );
}

function TagRow({
  label,
  items,
  variant = "default",
}: {
  label: string;
  items: string[];
  variant?: "default" | "primary";
}) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <Badge key={i} variant={variant}>
            {it}
          </Badge>
        ))}
      </div>
    </div>
  );
}
