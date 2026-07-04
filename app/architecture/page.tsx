import ArchitectureClient from "./ArchitectureClient";
import BoardAccessDenied from "@/components/BoardAccessDenied";
import { requireBoardAccess } from "@/lib/board-access";

export default async function ArchitecturePage() {
  const access = await requireBoardAccess("architecture");
  if (!access.allowed) return <BoardAccessDenied />;
  return <ArchitectureClient />;
}
