/**
 * Customer recommendation review page — Sprint 4 T-K01.
 * URL: /review?intake=<id>
 * Customer sees the expert's selected recommendations and can approve/decline each.
 */
import { Suspense } from "react";
import { ReviewFlow } from "./ReviewFlow";

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      }
    >
      <ReviewFlow />
    </Suspense>
  );
}
