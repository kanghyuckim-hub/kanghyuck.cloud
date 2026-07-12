import WorkManualClient from "./WorkManualClient";
import BoardAccessDenied from "@/components/BoardAccessDenied";
import { requireBoardAccess } from "@/lib/board-access";

export default async function WorkManualPage() {
  const access = await requireBoardAccess("work-manual");
  if (!access.allowed) return <BoardAccessDenied />;

  const isAdmin = access.member.role === "master" || access.member.role === "admin";
  return <WorkManualClient isAdmin={isAdmin} />;
}
