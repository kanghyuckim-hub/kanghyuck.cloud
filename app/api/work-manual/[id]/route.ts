import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await getSessionMember();
  if (!member || (member.role !== "master" && member.role !== "admin")) {
    return NextResponse.json({ error: "매뉴얼 삭제 권한이 없습니다." }, { status: 403 });
  }

  try {
    const pool = getDbPool();
    const result = await pool.query<{ blob_url: string }>(
      "delete from work_manuals where id = $1 returning blob_url",
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "매뉴얼을 찾을 수 없습니다." }, { status: 404 });
    }

    try {
      await del(result.rows[0].blob_url);
    } catch (blobError) {
      console.error("업무매뉴얼 blob 삭제 실패(무시하고 진행):", blobError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("업무매뉴얼 삭제 오류:", error);
    return NextResponse.json({ error: "매뉴얼 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
