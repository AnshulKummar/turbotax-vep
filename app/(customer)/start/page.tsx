/**
 * /start — Customer intake entry point. Sprint 3 T-F02.
 *
 * Server component that renders the StartFlow client component.
 */

import type { Metadata } from "next";

import { StartFlow } from "./StartFlow";

export const metadata: Metadata = {
  title: "Get Started — TurboTax Virtual Expert Platform",
  description:
    "Tell us about yourself, select your tax documents, and set your goals for the expert review.",
};

export default function StartPage() {
  return <StartFlow />;
}
