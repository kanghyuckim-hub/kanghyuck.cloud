import NoticeListPage from "@/components/NoticeListPage";
import BoardAccessDenied from "@/components/BoardAccessDenied";
import { requireBoardAccess } from "@/lib/board-access";

export default async function NoticesPage() {
  const access = await requireBoardAccess("notices");
  if (!access.allowed) return <BoardAccessDenied />;
  return <NoticeListPage />;
}
