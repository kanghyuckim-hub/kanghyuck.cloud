import MemberManagementClient from "./MemberManagementClient";
import BoardAccessDenied from "@/components/BoardAccessDenied";
import { requireBoardAccess } from "@/lib/board-access";

export default async function MemberManagementPage() {
  const access = await requireBoardAccess("member-management");
  if (!access.allowed) return <BoardAccessDenied />;
  return <MemberManagementClient />;
}
