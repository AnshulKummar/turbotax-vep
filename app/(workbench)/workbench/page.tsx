/**
 * The Expert Workbench page. Composes every Layer 3 panel.
 * The Workbench component is client-rendered because several panels
 * rely on state (minutes counter, modal, copilot warnings).
 */
import { Workbench } from "../../../components/workbench/Workbench";

export default function WorkbenchPage() {
  return <Workbench />;
}
