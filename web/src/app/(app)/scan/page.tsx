import { ScanExperience } from "@/components/ScanExperience";

export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
          Live Scan
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Scan culture for what fits you
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Set your lens, then watch WaveSight read the firehose and surface only
          the trends worth acting on.
        </p>
      </header>

      <ScanExperience />
    </div>
  );
}
