import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";

export interface MailMessageItem {
  id: string;
  fromAddress: string | null;
  fromName: string | null;
  toAddress: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: string | null;
  createdAt: string;
}

interface MailMessageRow {
  id: string;
  from_address: string | null;
  from_name: string | null;
  to_address: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string | null;
  created_at: string;
}

async function hasMailBoardAccess(userId: string, role: string): Promise<boolean> {
  if (role === "master" || role === "admin") return true;
  const pool = getDbPool();
  const result = await pool.query(
    "select 1 from user_board_access where user_id = $1 and board_key = 'mail'",
    [userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function GET() {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!(await hasMailBoardAccess(member.id, member.role))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const pool = getDbPool();
    const result = await pool.query<MailMessageRow>(`
      select id, from_address, from_name, to_address, subject, snippet, body_text, body_html, received_at, created_at
      from mail_messages
      order by coalesce(received_at, created_at) desc
      limit 200
    `);

    const messages: MailMessageItem[] = result.rows.map((row) => ({
      id: row.id,
      fromAddress: row.from_address,
      fromName: row.from_name,
      toAddress: row.to_address,
      subject: row.subject,
      snippet: row.snippet,
      bodyText: row.body_text,
      bodyHtml: row.body_html,
      receivedAt: row.received_at,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching mail messages:", error);
    return NextResponse.json({ error: "메일함을 불러오는 중 오류가 발생했습니다.", messages: [] });
  }
}
