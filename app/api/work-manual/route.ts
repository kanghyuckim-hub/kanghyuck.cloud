import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";
import { fetchAndParseDataFile } from "@/lib/parseDataFile";

export interface WorkManualItem {
  id: string;
  fileName: string;
  createdAt: string;
}

export async function GET() {
  try {
    const pool = getDbPool();
    const result = await pool.query<{ id: string; file_name: string; created_at: string }>(
      "select id, file_name, created_at from work_manuals order by created_at desc"
    );
    const manuals: WorkManualItem[] = result.rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      createdAt: row.created_at,
    }));
    return NextResponse.json({ manuals });
  } catch (error) {
    console.error("업무매뉴얼 목록 조회 오류:", error);
    return NextResponse.json({ error: "매뉴얼 목록을 불러오는 중 오류가 발생했습니다.", manuals: [] });
  }
}

export async function POST(request: NextRequest) {
  const member = await getSessionMember();
  if (!member || (member.role !== "master" && member.role !== "admin")) {
    return NextResponse.json({ error: "매뉴얼 등록 권한이 없습니다." }, { status: 403 });
  }

  const { blobUrl, fileName } = (await request.json()) as { blobUrl?: string; fileName?: string };
  if (!blobUrl || !fileName) {
    return NextResponse.json({ error: "파일 정보가 필요합니다." }, { status: 400 });
  }

  try {
    const contentText = await fetchAndParseDataFile(blobUrl);
    if (!contentText.trim()) {
      return NextResponse.json({ error: "파일에서 텍스트를 추출하지 못했습니다." }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);

    const pool = getDbPool();
    const result = await pool.query<{ id: string; created_at: string }>(
      `insert into work_manuals (file_name, blob_url, content_text, uploaded_by)
       values ($1, $2, $3, $4)
       returning id, created_at`,
      [fileName, blobUrl, contentText, isUuid ? member.id : null]
    );

    return NextResponse.json({
      manual: { id: result.rows[0].id, fileName, createdAt: result.rows[0].created_at },
    });
  } catch (error) {
    console.error("업무매뉴얼 등록 오류:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `매뉴얼 등록 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
