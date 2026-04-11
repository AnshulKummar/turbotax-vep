import Link from "next/link";

/**
 * Route-group frame shared by /workbench and /workbench/metrics.
 * Agent 6 owns the metrics page itself, but this frame is Agent 4's.
 */
export default function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[rgba(5,5,8,0.75)] backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-[#050508]">
              VEP
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                TurboTax Virtual Expert Platform
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)]">
                Layer 3 — Expert Workbench
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-1 text-xs">
            <Link
              href="/workbench"
              className="rounded-md px-3 py-1.5 text-[var(--muted-foreground)] transition hover:bg-white/5 hover:text-white"
            >
              Workbench
            </Link>
            <Link
              href="/workbench/metrics"
              className="rounded-md px-3 py-1.5 text-[var(--muted-foreground)] transition hover:bg-white/5 hover:text-white"
            >
              Metrics
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-6">{children}</main>
    </div>
  );
}
