import { AppShell } from "@/components/AppShell";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      {isSupabaseConfigured() ? null : (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm text-warning">
          <span className="font-semibold">Demo data.</span> No database is
          connected — every trend shown here is illustrative, not observed.
          Connect Supabase to track the real thing.
        </div>
      )}
      {children}
    </AppShell>
  );
}
