/**
 * T-715 — Shared footer for public pages.
 *
 * Rendered on `/`, `/intake`, and `/workbench`. Author byline, GitHub
 * repo link, and the "synthetic data only" reminder. Kept as a server
 * component so it adds no client JS.
 */
const GITHUB_URL = "https://github.com/AnshulKummar/turbotax-vep";

export function PublicFooter() {
  return (
    <footer className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-[11px] text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        Built by{" "}
        <span className="font-medium text-white">Anshul Kummar</span>. Not
        affiliated with Intuit.
      </div>
      <div className="flex items-center gap-4">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="transition hover:text-white"
        >
          GitHub
        </a>
        <span>
          Synthetic data only &mdash; do not enter real personal information.
        </span>
      </div>
    </footer>
  );
}
