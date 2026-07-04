import MailClient from "./MailClient";
import BoardAccessDenied from "@/components/BoardAccessDenied";
import { requireBoardAccess } from "@/lib/board-access";

export default async function MailPage() {
  const access = await requireBoardAccess("mail");
  if (!access.allowed) return <BoardAccessDenied />;
  return <MailClient />;
}
