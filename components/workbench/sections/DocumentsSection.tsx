/**
 * DocumentsSection — Sprint 3 T-G04.
 *
 * Displays selected documents as read-only cards.
 */
import {
  get_documents_by_ids,
  type DemoDocument,
} from "../../../src/lib/customer/documents";
import { AppCue } from "../AppCue";

interface DocumentsSectionProps {
  document_ids?: string[];
}

const CATEGORY_COLORS: Record<DemoDocument["category"], string> = {
  income: "pill pill-violet",
  deduction: "pill pill-cyan",
  investment: "pill pill-blue",
  health: "pill pill-amber",
  other: "pill pill-blue",
};

export function DocumentsSection({ document_ids }: DocumentsSectionProps) {
  const documents = document_ids ? get_documents_by_ids(document_ids) : [];

  if (documents.length === 0) {
    return (
      <div className="space-y-4" data-testid="documents-section">
        <AppCue
          title="Document Awareness"
          body="The expert sees exactly which documents the customer uploaded. In production, these would be OCR-parsed and cross-referenced against the return for anomaly detection (Big Bet B3)."
        />
        <h2 className="text-[15px] font-semibold text-white">Documents</h2>
        <div className="glass-card px-5 py-8 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            No documents uploaded yet.
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
            Documents selected during the customer intake flow will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="documents-section">
      <AppCue
        title="Document Awareness"
        body="The expert sees exactly which documents the customer uploaded. In production, these would be OCR-parsed and cross-referenced against the return for anomaly detection (Big Bet B3)."
      />
      <h2 className="text-[15px] font-semibold text-white">
        Documents ({documents.length})
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <div key={doc.id} className="glass-card px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-white">
                {doc.form_type}
              </h3>
              <span className={CATEGORY_COLORS[doc.category]}>
                {doc.category}
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-white/80">{doc.issuer}</p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              {doc.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
