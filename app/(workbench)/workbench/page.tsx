/**
 * The Expert Workbench page.
 *
 * Sprint 2 adds public mode: when the URL carries `?intake=<id>` the page
 * reads the stored goal vector from Postgres via `get_intake`, runs the
 * recommendation engine against the Mitchell return with those goals, and
 * passes the results into the Workbench component so the goal-mix-aware
 * ranking is visible on first paint.
 *
 *   - no intake param      -> default Mitchell goal fixture, CTA hidden
 *   - valid intake param   -> stored goals + server-computed recs, CTA visible
 *   - invalid intake param -> friendly error with a "start over" link
 *
 * The customer-name and routing-chip strings remain hardcoded to the
 * Mitchell return; Sprint 2 does not introduce multi-return support.
 */
import Link from "next/link";

import type { CustomerContext, Goal, Recommendation } from "@/contracts";
import { mitchell_return } from "@/data/mitchell-return";
import { get_intake } from "@/lib/intake/store";
import { produce_recommendations } from "@/lib/recommendations/engine";

import { mitchellGoalsFixture } from "../../../components/workbench/__fixtures__/mitchell-goals.fixture";
import { Workbench } from "../../../components/workbench/Workbench";

// Avoid static pre-rendering — the page hits Postgres on every request.
export const dynamic = "force-dynamic";

interface WorkbenchPageProps {
  searchParams: Promise<{ intake?: string }>;
}

interface ResolvedIntake {
  goals: Goal[];
  recommendations: Recommendation[];
  showIntakeCta: boolean;
}

async function resolve_intake(
  intakeParam: string | undefined,
): Promise<
  | { kind: "ok"; data: ResolvedIntake }
  | { kind: "invalid"; reason: string }
> {
  if (!intakeParam) {
    // Sprint 1 default: use the bundled Mitchell goal fixture so the
    // workbench is never broken. No CTA banner in this mode.
    const goals = mitchellGoalsFixture;
    const recommendations = await run_engine(goals);
    return {
      kind: "ok",
      data: { goals, recommendations, showIntakeCta: false },
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

  const recommendations = await run_engine(row.goals);
  return {
    kind: "ok",
    data: {
      goals: row.goals,
      recommendations,
      showIntakeCta: true,
    },
  };
}

async function run_engine(goals: Goal[]): Promise<Recommendation[]> {
  const customer_context: CustomerContext = {
    case_id: mitchell_return.case_id,
    customer_display_name: `${mitchell_return.taxpayer.first_name} & ${
      mitchell_return.spouse?.first_name ?? ""
    } ${mitchell_return.taxpayer.last_name}`,
    goals,
  };
  try {
    const result = await produce_recommendations(
      mitchell_return,
      goals,
      customer_context,
    );
    return result.recommendations;
  } catch (err) {
    // If the cassette can't be read (e.g. during a first-boot prod deploy
    // before the workflow has recorded one) fall back to an empty rec set
    // so the page still renders. The Workbench will then try its own
    // client fetch, which will land on the /api/recommendations route.
    console.error("[workbench] produce_recommendations failed:", err);
    return [];
  }
}

export default async function WorkbenchPage({
  searchParams,
}: WorkbenchPageProps) {
  const { intake } = await searchParams;
  const resolved = await resolve_intake(intake);

  if (resolved.kind === "invalid") {
    return (
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
    );
  }

  return (
    <Workbench
      initialGoals={resolved.data.goals}
      initialRecommendations={resolved.data.recommendations}
      showIntakeCta={resolved.data.showIntakeCta}
    />
  );
}
