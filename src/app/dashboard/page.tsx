import type { Metadata } from "next";
import { WorkflowsHome } from "./_components/WorkflowsHome";

export const metadata: Metadata = { title: "My Workflows" };

export default function DashboardPage() {
  return <WorkflowsHome />;
}
