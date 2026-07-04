import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";
import { notifyMemberOfDecision } from "@/lib/notify";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const member = await getSessionMember();
  if (!member || (member.role !== "master" && member.role !== "admin")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await request.json()) as { action?: unknown; boardKeys?: unknown };
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "action은 approve 또는 reject여야 합니다." }, { status: 400 });
  }
  const action = body.action;

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("begin");

    const reqResult = await client.query<{ requested_board_keys: string[]; email: string; name: string | null }>(
      `select r.requested_board_keys, u.email, u.name
       from board_access_requests r
       join users u on u.id = r.user_id
       where r.user_id = $1
       for update`,
      [userId]
    );
    const reqRow = reqResult.rows[0];
    if (!reqRow) {
      await client.query("rollback");
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    const boardKeys =
      action === "approve"
        ? Array.isArray(body.boardKeys) && body.boardKeys.every((k) => typeof k === "string")
          ? (body.boardKeys as string[])
          : reqRow.requested_board_keys
        : [];

    await client.query(
      `update board_access_requests
       set status = $2, approved_board_keys = $3, reviewed_by = $4, reviewed_at = now()
       where user_id = $1`,
      [userId, action === "approve" ? "approved" : "rejected", boardKeys, member.id]
    );

    if (action === "approve") {
      await client.query("delete from user_board_access where user_id = $1", [userId]);
      for (const boardKey of boardKeys) {
        await client.query(
          `insert into user_board_access (user_id, board_key) values ($1, $2) on conflict do nothing`,
          [userId, boardKey]
        );
      }
    }

    await client.query("commit");

    let boardLabels: string[] = [];
    if (boardKeys.length > 0) {
      const labelResult = await pool.query<{ label: string }>(
        "select label from boards where key = any($1)",
        [boardKeys]
      );
      boardLabels = labelResult.rows.map((r) => r.label);
    }

    try {
      await notifyMemberOfDecision({
        memberEmail: reqRow.email,
        memberName: reqRow.name || reqRow.email,
        approved: action === "approve",
        boardLabels,
      });
    } catch (error) {
      console.error("회원 알림 메일 발송 실패:", error);
    }

    return NextResponse.json({ ok: true, status: action === "approve" ? "approved" : "rejected", boardKeys });
  } catch (error) {
    await client.query("rollback");
    console.error("게시판 이용 신청 처리 오류:", error);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  } finally {
    client.release();
  }
}
