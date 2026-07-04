import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export interface BoardItem {
  key: string;
  label: string;
  description: string | null;
}

export async function GET() {
  try {
    const pool = getDbPool();
    const result = await pool.query<BoardItem>(
      "select key, label, description from boards order by sort_order asc"
    );
    return NextResponse.json({ boards: result.rows });
  } catch (error) {
    console.error("Error fetching boards:", error);
    return NextResponse.json({ error: "게시판 목록을 불러오는 중 오류가 발생했습니다.", boards: [] });
  }
}
