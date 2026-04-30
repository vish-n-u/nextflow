import type { Metadata } from "next";
import { DashboardShell } from "../_components/DashboardShell";

export const metadata: Metadata = { title: "New Workflow" };

export default async function NewWorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return <DashboardShell fromAppId={from} />;
}
