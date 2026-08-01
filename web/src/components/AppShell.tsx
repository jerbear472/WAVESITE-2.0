"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Radar, Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pulse", label: "Pulse" },
  { href: "/timeline", label: "Timeline" },
  { href: "/waves", label: "Library" },
  { href: "/track-record", label: "Track record" },
  { href: "/brief", label: "Brief" },
  { href: "/saved", label: "Saved" },
  { href: "/daily", label: "Daily" },
  { href: "/admin", label: "Import" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/wavesight-mark-open.png"
                alt="WaveSight"
                width={36}
                height={36}
                className="size-9 shrink-0"
                priority
              />
              <span className="font-display wordmark text-[22px]">
                Wave<span className="text-gradient">Sight</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary-tint text-primary-strong"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/scan"
              className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
            >
              <Radar className="size-4" /> Run Scan
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
              aria-label="Toggle menu"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open ? (
          <div className="border-t border-border bg-card md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
              <Link
                href="/scan"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-primary-strong"
              >
                <Radar className="size-4" /> Run Scan
              </Link>
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:py-14">
        {children}
      </main>
    </div>
  );
}
