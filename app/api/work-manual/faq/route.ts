import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export interface WorkManualFaqItem {
  rank: number;
  question: string;
  answer: string;
  askCount: number;
}

export async function GET() {
  try {
    const pool = getDbPool();
    const result = await pool.query<{ rank: number; question: string; answer: string; ask_count: number }>(
      "select rank, question, answer, ask_count from work_manual_faq order by rank asc limit 15"
    );
    const faq: WorkManualFaqItem[] = result.rows.map((row) => ({
      rank: row.rank,
      question: row.question,
      answer: row.answer,
      askCount: row.ask_count,
    }));
    return NextResponse.json({ faq });
  } catch (error) {
    console.error("업무매뉴얼 FAQ 조회 오류:", error);
    return NextResponse.json({ error: "자주묻는질문을 불러오는 중 오류가 발생했습니다.", faq: [] });
  }
}
