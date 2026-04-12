/**
 * WorkbenchShell — Sprint 3 T-G01.
 *
 * Redesigned expert workbench with left-hand navigation and section-based
 * layout. Replaces the stacked-panel Workbench.tsx for the new expert view.
 *
 * STRATEGY CHOICE: Decomposition.
 * The original Workbench.tsx is a layout wrapper with client-side data
 * fetching and simple state. Rather than wrapping it wholesale, this shell
 * decomposes the panels into 6 sections, each importing the original panel
 * components directly. The existing Workbench.tsx is left untouched for
 * backward compatibility. Each section receives only the props it needs;
 * the data-fetching logic from Workbench.tsx is replicated here so that
 * pre-work panels and live fetches still work.
 *
 * Per AD-S3-05: customer_metadata is display-only, never enters LLM prompts.
 * Per AD-S3-08: customer_metadata is not in audit capture.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AuditEvent,
  CustomerContext,
  Goal,
  LineId,
  PreWorkResponse,
  Recommendation,
  RedactedPrompt,
  RuleFinding,
  TaxReturn,
} from "../../src/contracts";

import { mitchellPreWorkFixture } from "./__fixtures__/mitchell-prework.fixture";
import { mitchellRecommendationsFixture } from "./__fixtures__/mitchell-recommendations.fixture";
import {
  auditTrailFixture,
  whatAiSawFixture,
} from "./__fixtures__/whatAiSaw.fixture";
import {
  fetchAuditTrail,
  fetchPreWork,
  fetchRecommendations,
  fetchWhatAISaw,
} from "./lib/api";

import { BriefSection } from "./sections/BriefSection";
import { GoalsSection } from "./sections/GoalsSection";
import { DocumentsSection } from "./sections/DocumentsSection";
import { PreworkSection } from "./sections/PreworkSection";
import { RecommendationsSection } from "./sections/RecommendationsSection";
import { AuditSection } from "./sections/AuditSection";

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

export const SECTION_IDS = [
  "brief",
  "goals",
  "documents",
  "prework",
  "recommendations",
  "audit",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const DEFAULT_SECTION: SectionId = "brief";

interface SectionDef {
  id: SectionId;
  label: string;
  /** Unicode icon — no heavy icon library */
  icon: string;
}

const SECTIONS: SectionDef[] = [
  { id: "brief", label: "Brief", icon: "\u{1F4CB}" },
  { id: "goals", label: "Goals", icon: "\u{1F3AF}" },
  { id: "documents", label: "Documents", icon: "\u{1F4C4}" },
  { id: "prework", label: "Pre-work", icon: "\u{1F50D}" },
  { id: "recommendations", label: "Recommendations", icon: "\u{2B50}" },
  { id: "audit", label: "Audit", icon: "\u{1F512}" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkbenchShellProps {
  customer_name: string;
  filing_status?: string;
  agi_band?: string;
  document_ids?: string[];
  goals: Goal[];
  recommendations: Recommendation[];
  findings: RuleFinding[];
  return_data: TaxReturn;
  customer_context: CustomerContext;
  audit_id: number;
  initial_section?: string;
}

// ---------------------------------------------------------------------------
// Section routing helper (pure function, testable)
// ---------------------------------------------------------------------------

export function resolve_section(raw: string | undefined): SectionId {
  if (!raw) return DEFAULT_SECTION;
  const lower = raw.toLowerCase();
  if ((SECTION_IDS as readonly string[]).includes(lower)) {
    return lower as SectionId;
  }
  return DEFAULT_SECTION;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkbenchShell({
  customer_name,
  filing_status,
  agi_band,
  document_ids,
  goals,
  recommendations: initialRecommendations,
  findings,
  return_data,
  customer_context,
  audit_id,
  initial_section,
}: WorkbenchShellProps) {
  const [activeSection, setActiveSection] = useState<SectionId>(
    resolve_section(initial_section),
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ------- Data state (mirrors Workbench.tsx fetch pattern) -------
  const seededFromServer = initialRecommendations.length > 0;

  const [prework, setPrework] =
    useState<PreWorkResponse>(mitchellPreWorkFixture);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    seededFromServer ? initialRecommendations : mitchellRecommendationsFixture,
  );
  const [auditEvents, setAuditEvents] =
    useState<AuditEvent[]>(auditTrailFixture);
  const [redactedPrompt, setRedactedPrompt] =
    useState<RedactedPrompt>(whatAiSawFixture);

  const [lastEdit, setLastEdit] = useState<{
    lineId: LineId;
    value: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const [pre, recs, audit, what] = await Promise.all([
        fetchPreWork(mitchellPreWorkFixture),
        seededFromServer
          ? Promise.resolve({ recommendations: initialRecommendations, audit_id: 0 })
          : fetchRecommendations({
              recommendations: mitchellRecommendationsFixture,
              audit_id: 0,
            }),
        fetchAuditTrail("mitchell-2025-001", { events: auditTrailFixture }),
        fetchWhatAISaw("rec-001", whatAiSawFixture),
      ]);
      setPrework(pre);
      if (!seededFromServer) {
        setRecommendations(recs.recommendations);
      }
      setAuditEvents(audit.events);
      setRedactedPrompt(what);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recommendationsByRuleId = useMemo(() => {
    const map: Record<string, Recommendation> = {};
    for (const rec of recommendations) {
      map[rec.rule_id] = rec;
    }
    return map;
  }, [recommendations]);

  // ------- Section navigation -------
  const navigateToSection = useCallback((id: SectionId) => {
    setActiveSection(id);
    setMobileNavOpen(false);
    // Update URL for shareability without server round-trip
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("section", id);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // SSR or URL parse failure — harmless
    }
  }, []);

  // ------- Badge counts -------
  const badgeCounts: Partial<Record<SectionId, number>> = {
    goals: goals.length,
    documents: document_ids?.length ?? 0,
    recommendations: recommendations.length,
    audit: auditEvents.length,
  };

  // ------- Filing status display label -------
  const filingStatusLabel: Record<string, string> = {
    single: "Single",
    mfj: "MFJ",
    mfs: "MFS",
    hoh: "HoH",
    qw: "QW",
  };

  const agiBandLabel: Record<string, string> = {
    under_50k: "< $50K",
    "50_100k": "$50-100K",
    "100_250k": "$100-250K",
    "250_500k": "$250-500K",
    over_500k: "> $500K",
  };

  return (
    <div
      className="flex min-h-[calc(100vh-120px)]"
      data-testid="workbench-shell"
    >
      {/* ---- Left nav (fixed >= 1024px, toggleable < 1024px) ---- */}
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <nav
        className={`
          fixed top-0 left-0 z-50 flex h-full w-[220px] flex-col
          border-r border-white/5 bg-[#0a0a12]
          transition-transform lg:sticky lg:top-0 lg:z-auto lg:translate-x-0
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        data-testid="workbench-nav"
      >
        {/* Nav header */}
        <div className="border-b border-white/5 px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Expert Workbench
          </div>
          <div className="mt-1 text-[13px] font-semibold text-white">
            {customer_name}
          </div>
        </div>

        {/* Nav items */}
        <ul className="flex-1 space-y-0.5 px-2 py-3">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            const count = badgeCounts[section.id];
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => navigateToSection(section.id)}
                  className={`
                    flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                    text-[13px] transition
                    ${
                      isActive
                        ? "bg-violet-500/15 text-violet-200 font-semibold"
                        : "text-[var(--muted-foreground)] hover:bg-white/[0.04] hover:text-white"
                    }
                  `}
                  data-testid={`nav-${section.id}`}
                >
                  <span className="text-[16px]">{section.icon}</span>
                  <span className="flex-1 text-left">{section.label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={`
                        rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                        ${isActive ? "bg-violet-500/25 text-violet-200" : "bg-white/[0.06] text-[var(--muted-foreground)]"}
                      `}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Nav footer */}
        <div className="border-t border-white/5 px-4 py-3">
          <Link
            href="/"
            className="text-[11px] text-[var(--muted-foreground)] transition hover:text-white"
          >
            &larr; Back to queue
          </Link>
        </div>
      </nav>

      {/* ---- Main content ---- */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-[#0a0a12]/95 px-4 py-3 backdrop-blur">
          {/* Hamburger for mobile */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="rounded-md border border-white/10 p-1.5 text-white lg:hidden"
            aria-label="Toggle navigation"
            data-testid="nav-toggle"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 5h12M3 9h12M3 13h12" />
            </svg>
          </button>

          <div className="flex-1">
            <h1 className="text-[15px] font-semibold text-white">
              {customer_name}
            </h1>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            {filing_status && (
              <span className="pill pill-violet">
                {filingStatusLabel[filing_status] ?? filing_status}
              </span>
            )}
            {agi_band && (
              <span className="pill pill-cyan">
                AGI {agiBandLabel[agi_band] ?? agi_band}
              </span>
            )}
            <span className="pill pill-blue">
              {findings.length} findings
            </span>
          </div>

          <Link
            href="/"
            className="hidden text-[11px] text-[var(--muted-foreground)] transition hover:text-white lg:inline"
          >
            Back to queue
          </Link>
        </header>

        {/* Section content */}
        <main className="flex-1 overflow-y-auto p-4" data-testid="section-content">
          {activeSection === "brief" && (
            <BriefSection
              customer_name={customer_name}
              filing_status={filing_status}
              agi_band={agi_band}
              document_ids={document_ids}
              goals={goals}
              recommendations={recommendations}
              findings={findings}
              onNavigate={navigateToSection}
            />
          )}
          {activeSection === "goals" && (
            <GoalsSection goals={goals} />
          )}
          {activeSection === "documents" && (
            <DocumentsSection document_ids={document_ids} />
          )}
          {activeSection === "prework" && (
            <PreworkSection
              prework={prework}
              recommendations={recommendations}
              recommendationsByRuleId={recommendationsByRuleId}
              lastEdit={lastEdit}
              onLineEdit={(lineId, value) => setLastEdit({ lineId, value })}
            />
          )}
          {activeSection === "recommendations" && (
            <RecommendationsSection
              goals={goals}
              recommendations={recommendations}
              redactedPrompt={redactedPrompt}
            />
          )}
          {activeSection === "audit" && (
            <AuditSection auditEvents={auditEvents} />
          )}
        </main>
      </div>
    </div>
  );
}
