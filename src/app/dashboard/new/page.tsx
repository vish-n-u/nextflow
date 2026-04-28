import type { Metadata } from "next";
import { DashboardShell } from "../_components/DashboardShell";

export const metadata: Metadata = { title: "New Workflow" };

export default function NewWorkflowPage() {
  return <DashboardShell />;
}
