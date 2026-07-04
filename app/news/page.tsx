import NaverNewsList from "@/components/NaverNewsList";
import BoardAccessDenied from "@/components/BoardAccessDenied";
import { requireBoardAccess } from "@/lib/board-access";

export default async function NewsPage() {
  const access = await requireBoardAccess("news");
  if (!access.allowed) return <BoardAccessDenied />;
  return <NaverNewsList />;
}
