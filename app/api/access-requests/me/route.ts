import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";

export async function GET() {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const pool = getDbPool();
  const result = await pool.query(
    `select requested_board_keys, message, status, approved_board_keys, created_at, updated_at
     from board_access_requests where user_id = $1`,
    [member.id]
  );
  const row = result.rows[0];

  return NextResponse.json({
    request: row
      ? {
          requestedBoardKeys: row.requested_board_keys ?? [],
          message: row.message,
          status: row.status,
          approvedBoardKeys: row.approved_board_keys,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null,
  });
}
