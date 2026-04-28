import type { Metadata } from "next";
import { DashboardShell } from "../_components/DashboardShell";

export const metadata: Metadata = { title: "Workflow" };

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DashboardShell initialWorkflowId={id} />;
}
