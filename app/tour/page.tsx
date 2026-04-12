/**
 * /tour — Self-running guided product tour.
 *
 * Embeds the live app in an iframe with an overlay that auto-advances
 * through the demo script. Each step navigates the iframe to the
 * appropriate URL and shows narration captions.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { TourPlayer } from "./TourPlayer";

export const metadata: Metadata = {
  title: "Guided Tour — TurboTax Virtual Expert Platform",
  description:
    "Self-running product tour of the Goal-Aligned Recommendation System prototype.",
};

export default function TourPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[var(--muted-foreground)]">Loading tour...</p>
        </div>
      }
    >
      <TourPlayer />
    </Suspense>
  );
}
