import PerformanceEstimateClient from "./PerformanceEstimateClient";
import BoardAccessDenied from "@/components/BoardAccessDenied";
import { requireBoardAccess } from "@/lib/board-access";

export default async function PerformanceEstimatePage() {
  const access = await requireBoardAccess("performance-estimate");
  if (!access.allowed) return <BoardAccessDenied />;
  return <PerformanceEstimateClient />;
}
