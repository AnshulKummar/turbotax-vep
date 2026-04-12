/**
 * AuditSection — Sprint 3 T-G07.
 *
 * Re-parents the existing AuditTrailTimeline panel into the new section.
 * Does NOT rewrite the panel logic.
 */
import type { AuditEvent } from "../../../src/contracts";
import { AuditTrailTimeline } from "../AuditTrailTimeline";

interface AuditSectionProps {
  auditEvents: AuditEvent[];
}

export function AuditSection({ auditEvents }: AuditSectionProps) {
  return (
    <div className="space-y-4" data-testid="audit-section">
      <h2 className="text-[15px] font-semibold text-white">Audit Trail</h2>
      <AuditTrailTimeline events={auditEvents} />
    </div>
  );
}
