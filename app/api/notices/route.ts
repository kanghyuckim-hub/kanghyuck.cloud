import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";
import { hasBoardAccess } from "@/lib/board-access";

export interface NoticeAttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  author: string;
  category: "공지" | "업무" | "기타";
  isPinned: boolean;
  createdAt: string;
  attachments: NoticeAttachmentItem[];
}

interface NoticeRow {
  id: string;
  title: string;
  content: string;
  author: string;
  category: "공지" | "업무" | "기타";
  is_pinned: boolean;
  created_at: string;
}

interface AttachmentRow {
  id: string;
  notice_id: string;
  name: string;
  size: string;
  type: string;
  url: string;
}

export async function GET() {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!(await hasBoardAccess(member, "notices"))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const pool = getDbPool();
    const [noticesResult, attachmentsResult] = await Promise.all([
      pool.query<NoticeRow>(
        "select id, title, content, author, category, is_pinned, created_at from notices order by created_at desc"
      ),
      pool.query<AttachmentRow>(
        "select id, notice_id, name, size, type, url from notice_attachments order by created_at asc"
      ),
    ]);

    const attachmentsByNoticeId = new Map<string, NoticeAttachmentItem[]>();
    for (const row of attachmentsResult.rows) {
      const list = attachmentsByNoticeId.get(row.notice_id) ?? [];
      list.push({ id: row.id, name: row.name, size: Number(row.size), type: row.type, url: row.url });
      attachmentsByNoticeId.set(row.notice_id, list);
    }

    const notices: NoticeItem[] = noticesResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      author: row.author,
      category: row.category,
      isPinned: row.is_pinned,
      createdAt: row.created_at,
      attachments: attachmentsByNoticeId.get(row.id) ?? [],
    }));

    return NextResponse.json({ notices });
  } catch (error) {
    console.error("공지사항 목록 조회 오류:", error);
    return NextResponse.json({ error: "공지사항을 불러오는 중 오류가 발생했습니다.", notices: [] });
  }
}

export async function POST(request: NextRequest) {
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!(await hasBoardAccess(member, "notices"))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    content?: string;
    category?: string;
    isPinned?: boolean;
    attachments?: { name: string; size: number; type: string; url: string }[];
  };

  const title = body.title?.trim();
  const content = body.content?.trim();
  if (!title || !content) {
    return NextResponse.json({ error: "제목과 내용을 모두 입력해주세요." }, { status: 400 });
  }
  const category = body.category === "업무" || body.category === "기타" ? body.category : "공지";
  const isPinned = body.isPinned === true;
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);
  const author = member.name || member.email;

  const client = await getDbPool().connect();
  try {
    await client.query("begin");

    const noticeResult = await client.query<{ id: string; created_at: string }>(
      `insert into notices (title, content, author, category, is_pinned, created_by)
       values ($1, $2, $3, $4, $5, $6)
       returning id, created_at`,
      [title, content, author, category, isPinned, isUuid ? member.id : null]
    );
    const noticeId = noticeResult.rows[0].id;

    for (const att of attachments) {
      if (!att?.name || !att?.url) continue;
      await client.query(
        `insert into notice_attachments (notice_id, name, size, type, url) values ($1, $2, $3, $4, $5)`,
        [noticeId, att.name, att.size ?? 0, att.type ?? "application/octet-stream", att.url]
      );
    }

    await client.query("commit");

    return NextResponse.json({ ok: true, id: noticeId });
  } catch (error) {
    await client.query("rollback");
    console.error("공지사항 작성 오류:", error);
    return NextResponse.json({ error: "공지사항 작성 중 오류가 발생했습니다." }, { status: 500 });
  } finally {
    client.release();
  }
}
