import { redirect } from "next/navigation";
import { getDbPool } from "@/lib/db";
import { getSessionMember, type SessionMember } from "@/lib/auth";

export type BoardAccessResult =
  | { allowed: true; member: SessionMember }
  | { allowed: false; member: SessionMember };

// master/admin은 관리자로 간주해 모든 게시판에 접근 가능하고,
// user 역할만 user_board_access에 등록된 게시판으로 제한한다.
export async function hasBoardAccess(member: SessionMember, boardKey: string): Promise<boolean> {
  if (member.role === "master" || member.role === "admin") return true;

  const pool = getDbPool();
  const result = await pool.query(
    "select 1 from user_board_access where user_id = $1 and board_key = $2",
    [member.id, boardKey]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function requireBoardAccess(
  boardKey: string,
  returnTo: string = `/${boardKey}`
): Promise<BoardAccessResult> {
  const member = await getSessionMember();
  if (!member) {
    redirect(`/api/auth/login?returnTo=${returnTo}`);
  }

  return { allowed: await hasBoardAccess(member, boardKey), member };
}
