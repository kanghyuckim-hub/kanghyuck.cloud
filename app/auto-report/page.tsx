import MonthlyReportClient from "./MonthlyReportClient";
import BoardAccessDenied from "@/components/BoardAccessDenied";
import { requireBoardAccess } from "@/lib/board-access";

export default async function AutoReportPage() {
  const access = await requireBoardAccess("auto-report");
  if (!access.allowed) return <BoardAccessDenied />;
  return <MonthlyReportClient />;
}
