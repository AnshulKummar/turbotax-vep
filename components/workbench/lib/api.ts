import type {
  AuditTrailResponse,
  PreWorkResponse,
  RecommendationsResponse,
  RedactedPrompt,
} from "../../../src/contracts";

/**
 * Thin client over the Agent 2, 3, 5 API routes.
 * Returns the contract-shaped responses. Callers can fall back to the
 * local fixtures while the backend agents are still building their
 * route handlers in parallel worktrees.
 */

async function safeGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function fetchPreWork(
  fallback: PreWorkResponse,
): Promise<PreWorkResponse> {
  return safeGet<PreWorkResponse>("/api/prework", fallback);
}

export async function fetchRecommendations(
  fallback: RecommendationsResponse,
): Promise<RecommendationsResponse> {
  return safeGet<RecommendationsResponse>("/api/recommendations", fallback);
}

export async function fetchAuditTrail(
  caseId: string,
  fallback: AuditTrailResponse,
): Promise<AuditTrailResponse> {
  return safeGet<AuditTrailResponse>(
    `/api/audit?case_id=${encodeURIComponent(caseId)}`,
    fallback,
  );
}

export async function fetchWhatAISaw(
  recommendationId: string,
  fallback: RedactedPrompt,
): Promise<RedactedPrompt> {
  return safeGet<RedactedPrompt>(
    `/api/audit/${encodeURIComponent(recommendationId)}`,
    fallback,
  );
}
