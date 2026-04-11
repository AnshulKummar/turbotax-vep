import clsx from "clsx";

/** Shared glass-card panel wrapper. */
export function Panel({
  title,
  subtitle,
  right,
  className,
  contentClassName,
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx("glass-card flex flex-col", className)}>
      {(title || right) && (
        <header className="glass-divider flex items-start justify-between gap-3 px-4 py-3">
          <div>
            {title && (
              <h2 className="text-[13px] font-semibold tracking-tight text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                {subtitle}
              </p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      <div className={clsx("p-4", contentClassName)}>{children}</div>
    </section>
  );
}
