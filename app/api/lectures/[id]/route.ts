import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";
import type { LectureSlide } from "@/app/api/lectures/route";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const pool = getDbPool();
    const result = await pool.query<{
      id: string;
      file_name: string;
      title: string;
      character_key: string;
      slides: LectureSlide[];
      created_at: string;
    }>(
      "select id, file_name, title, character_key, slides, created_at from lectures where id = $1",
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다." }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      lecture: {
        id: row.id,
        fileName: row.file_name,
        title: row.title,
        characterKey: row.character_key,
        slides: row.slides,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error("강의 조회 오류:", error);
    return NextResponse.json({ error: "강의를 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await getSessionMember();
  if (!member || (member.role !== "master" && member.role !== "admin")) {
    return NextResponse.json({ error: "강의 삭제 권한이 없습니다." }, { status: 403 });
  }

  try {
    const pool = getDbPool();
    const result = await pool.query<{ blob_url: string }>(
      "delete from lectures where id = $1 returning blob_url",
      [id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다." }, { status: 404 });
    }

    try {
      await del(result.rows[0].blob_url);
    } catch (blobError) {
      console.error("강의 자료 blob 삭제 실패(무시하고 진행):", blobError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("강의 삭제 오류:", error);
    return NextResponse.json({ error: "강의 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
