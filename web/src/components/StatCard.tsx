import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "danger" | "warning" | "violet";

const toneText: Record<Tone, string> = {
  primary: "text-primary-strong",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  violet: "text-violet",
};

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-faint">
          {label}
        </p>
        <Icon className={cn("size-4", toneText[tone])} />
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
    </Card>
  );
}
