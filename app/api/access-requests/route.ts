import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";
import { notifyMastersOfAccessRequest } from "@/lib/notify";

export interface AccessRequestItem {
  userId: string;
  name: string | null;
  email: string;
  requestedBoardKeys: string[];
  message: string | null;
  status: string;
  approvedBoardKeys: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface AccessRequestRow {
  user_id: string;
  name: string | null;
  email: string;
  requested_board_keys: string[];
  message: string | null;
  status: string;
  approved_board_keys: string[] | null;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  const member = await getSessionMember();
  if (!member || (member.role !== "master" && member.role !== "admin")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const pool = getDbPool();
  const result = await pool.query<AccessRequestRow>(`
    select r.user_id, u.name, u.email, r.requested_board_keys, r.message,
           r.status, r.approved_board_keys, r.created_at, r.updated_at
    from board_access_requests r
    join users u on u.id = r.user_id
    order by (r.status = 'pending') desc, r.created_at desc
  `);

  const requests: AccessRequestItem[] = result.rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    email: row.email,
    requestedBoardKeys: row.requested_board_keys ?? [],
    message: row.message,
    status: row.status,
    approvedBoardKeys: row.approved_board_keys,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as { boardKeys?: unknown; message?: unknown };
  if (!Array.isArray(body.boardKeys) || !body.boardKeys.every((k) => typeof k === "string")) {
    return NextResponse.json({ error: "boardKeys는 문자열 배열이어야 합니다." }, { status: 400 });
  }
  const boardKeys = body.boardKeys as string[];
  const message = typeof body.message === "string" && body.message.trim() ? body.message.trim().slice(0, 1000) : null;

  const pool = getDbPool();
  await pool.query(
    `insert into board_access_requests (user_id, requested_board_keys, message, status, approved_board_keys, reviewed_by, reviewed_at)
     values ($1, $2, $3, 'pending', null, null, null)
     on conflict (user_id) do update set
       requested_board_keys = excluded.requested_board_keys,
       message = excluded.message,
       status = 'pending',
       approved_board_keys = null,
       reviewed_by = null,
       reviewed_at = null`,
    [member.id, boardKeys, message]
  );

  const [{ rows: masterRows }, { rows: boardRows }] = await Promise.all([
    pool.query<{ email: string }>(
      `select u.email from users u join user_roles ur on ur.user_id = u.id where ur.role = 'master'`
    ),
    boardKeys.length > 0
      ? pool.query<{ label: string }>("select label from boards where key = any($1)", [boardKeys])
      : Promise.resolve({ rows: [] as { label: string }[] }),
  ]);

  try {
    await notifyMastersOfAccessRequest({
      masterEmails: masterRows.map((r) => r.email),
      requesterName: member.name || member.email,
      requesterEmail: member.email,
      boardLabels: boardRows.map((r) => r.label),
      message,
    });
  } catch (error) {
    console.error("마스터 알림 메일 발송 실패:", error);
  }

  return NextResponse.json({ ok: true });
}
