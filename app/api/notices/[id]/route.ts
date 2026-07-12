import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";
import { hasBoardAccess } from "@/lib/board-access";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await getSessionMember();
  if (!member) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!(await hasBoardAccess(member, "notices"))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const pool = getDbPool();
    const attachmentsResult = await pool.query<{ url: string }>(
      "select url from notice_attachments where notice_id = $1",
      [id]
    );

    const result = await pool.query("delete from notices where id = $1", [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
    }

    if (attachmentsResult.rows.length > 0) {
      try {
        await del(attachmentsResult.rows.map((row) => row.url));
      } catch (blobError) {
        console.error("공지사항 첨부파일 blob 삭제 실패(무시하고 진행):", blobError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("공지사항 삭제 오류:", error);
    return NextResponse.json({ error: "공지사항 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
