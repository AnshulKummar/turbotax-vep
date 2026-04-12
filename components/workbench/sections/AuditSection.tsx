/**
 * AuditSection — Sprint 3 T-G07.
 *
 * Re-parents the existing AuditTrailTimeline panel into the new section.
 * Does NOT rewrite the panel logic.
 */
import type { AuditEvent } from "../../../src/contracts";
import { AuditTrailTimeline } from "../AuditTrailTimeline";
import { AppCue } from "../AppCue";

interface AuditSectionProps {
  auditEvents: AuditEvent[];
}

export function AuditSection({ auditEvents }: AuditSectionProps) {
  return (
    <div className="space-y-4" data-testid="audit-section">
      <AppCue
        title="Trust Layer"
        body="Every AI suggestion and expert action is captured in an auditable trail. This is the foundation for Big Bet B4 (Expert as Trainer) — expert decisions become labeled training data that makes the system smarter each season."
        accentColor="amber"
      />
      <h2 className="text-[15px] font-semibold text-white">Audit Trail</h2>
      <AuditTrailTimeline events={auditEvents} />
    </div>
  );
}
