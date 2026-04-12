/**
 * The Expert Workbench page — Sprint 3 T-G08 refactor.
 *
 * Sprint 3 replaces the stacked-panel <Workbench> with the section-based
 * <WorkbenchShell> that has left-hand navigation and 6 distinct sections
 * (Brief, Goals, Documents, Pre-work, Recommendations, Audit).
 *
 * Data loading is unchanged from Sprint 2:
 *   - no intake param      -> default Mitchell goal fixture
 *   - valid intake param   -> stored goals + server-computed recs
 *   - invalid intake param -> friendly error with a "start over" link
 *
 * Sprint 3 addition: reads customer_metadata from intake if present and
 * passes display_name, filing_status, agi_band, document_ids to the shell.
 * Per AD-S3-05: customer_metadata NEVER enters the LLM prompt.
 * Per AD-S3-08: customer_metadata not in audit capture.
 */
import Link from "next/link";

import type { CustomerContext, Goal, Recommendation, RuleFinding } from "@/contracts";
import { mitchell_return } from "@/data/mitchell-return";
import { get_intake } from "@/lib/intake/store";
import { produce_recommendations } from "@/lib/recommendations/engine";
import { evaluate_all } from "@/lib/rules";
import type { CustomerMetadata } from "@/lib/intake/metadata";

import { DisclaimerBanner } from "../../../components/public/DisclaimerBanner";
import { PublicFooter } from "../../../components/public/PublicFooter";
import { mitchellGoalsFixture } from "../../../components/workbench/__fixtures__/mitchell-goals.fixture";
import { WorkbenchShell } from "../../../components/workbench/WorkbenchShell";

// Avoid static pre-rendering — the page hits Postgres on every request.
export const dynamic = "force-dynamic";

interface WorkbenchPageProps {
  searchParams: Promise<{ intake?: string; section?: string }>;
}

interface ResolvedIntake {
  goals: Goal[];
  recommendations: Recommendation[];
  findings: RuleFinding[];
  customer_context: CustomerContext;
  audit_id: number;
  customer_metadata?: CustomerMetadata;
}

async function resolve_intake(
  intakeParam: string | undefined,
): Promise<
  | { kind: "ok"; data: ResolvedIntake }
  | { kind: "invalid"; reason: string }
> {
  if (!intakeParam) {
    const goals = mitchellGoalsFixture;
    const { recommendations, audit_id, customer_context, findings } =
      await run_engine(goals);
    return {
      kind: "ok",
      data: { goals, recommendations, findings, customer_context, audit_id },
    };
  }

  const intake_id = Number(intakeParam);
  if (
    !Number.isFinite(intake_id) ||
    !Number.isInteger(intake_id) ||
    intake_id <= 0
  ) {
    return { kind: "invalid", reason: "That intake id isn't a valid number." };
  }

  const row = await get_intake(intake_id);
  if (!row) {
    return {
      kind: "invalid",
      reason:
        "We couldn't find that intake. It may have expired (sessions live for 7 days) or never existed.",
    };
  }

  const { recommendations, audit_id, customer_context, findings } =
    await run_engine(row.goals);
  return {
    kind: "ok",
    data: {
      goals: row.goals,
      recommendations,
      findings,
      customer_context,
      audit_id,
      customer_metadata: row.customer_metadata,
    },
  };
}

async function run_engine(goals: Goal[]): Promise<{
  recommendations: Recommendation[];
  audit_id: number;
  customer_context: CustomerContext;
  findings: RuleFinding[];
}> {
  const customer_context: CustomerContext = {
    case_id: mitchell_return.case_id,
    customer_display_name: `${mitchell_return.taxpayer.first_name} & ${
      mitchell_return.spouse?.first_name ?? ""
    } ${mitchell_return.taxpayer.last_name}`,
    goals,
  };

  const findings = evaluate_all(mitchell_return);

  try {
    const result = await produce_recommendations(
      mitchell_return,
      goals,
      customer_context,
    );
    return {
      recommendations: result.recommendations,
      audit_id: result.audit_id,
      customer_context,
      findings,
    };
  } catch (err) {
    console.error("[workbench] produce_recommendations failed:", err);
    return {
      recommendations: [],
      audit_id: 0,
      customer_context,
      findings,
    };
  }
}

export default async function WorkbenchPage({
  searchParams,
}: WorkbenchPageProps) {
  const { intake, section } = await searchParams;
  const resolved = await resolve_intake(intake);

  if (resolved.kind === "invalid") {
    return (
      <div className="space-y-6">
        <DisclaimerBanner />
        <div className="glass-card mx-auto max-w-lg p-6 text-center">
          <h1 className="text-base font-semibold text-white">
            We can&apos;t load that intake
          </h1>
          <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
            {resolved.reason}
          </p>
          <Link
            href="/intake"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-[#050508] transition hover:brightness-110"
          >
            Start over
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const { data } = resolved;
  const cm = data.customer_metadata;

  // Default customer name from Mitchell return when no customer metadata
  const customer_name =
    cm?.display_name ??
    `${mitchell_return.taxpayer.first_name} & ${
      mitchell_return.spouse?.first_name ?? ""
    } ${mitchell_return.taxpayer.last_name}`;

  return (
    <div className="space-y-4">
      <DisclaimerBanner />
      <WorkbenchShell
        customer_name={customer_name}
        filing_status={cm?.filing_status}
        agi_band={cm?.agi_band}
        document_ids={cm?.document_ids}
        goals={data.goals}
        recommendations={data.recommendations}
        findings={data.findings}
        return_data={mitchell_return}
        customer_context={data.customer_context}
        audit_id={data.audit_id}
        initial_section={section}
      />
      <PublicFooter />
    </div>
  );
}
