import BusinessAnalysisClient from "./BusinessAnalysisClient";
import BoardAccessDenied from "@/components/BoardAccessDenied";
import { requireBoardAccess } from "@/lib/board-access";

export default async function BusinessAnalysisPage() {
  const access = await requireBoardAccess("business-analysis");
  if (!access.allowed) return <BoardAccessDenied />;
  return <BusinessAnalysisClient />;
}
