import { getAllSignals, getTrends } from "@/lib/data";
import { AdminImport } from "@/components/AdminImport";
import { isAIConfigured } from "@/lib/ai/provider";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [signals, trends] = await Promise.all([getAllSignals(), getTrends()]);
  const aiLive = isAIConfigured();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary-strong">
            Ingestion
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight">
            Import Signals
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Manually add signals, analyze them with AI, then cluster them into
            trends or attach them to existing ones. Live platform connectors plug
            in here later.
          </p>
        </div>
        <Badge variant={aiLive ? "success" : "warning"}>
          {aiLive ? "AI: Claude connected" : "AI: Mock mode"}
        </Badge>
      </header>

      <AdminImport initialSignals={signals} trends={trends} />
    </div>
  );
}
