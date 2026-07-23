import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDbPool } from "@/lib/db";
import { isOverloadedError, withGeminiFallback } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_QUESTIONS = 1000;
const MAX_PROMPT_CHARS = 100000;

interface FaqEntry {
  question: string;
  answer: string;
  count: number;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  const querySecret = new URL(request.url).searchParams.get("secret");

  return headerSecret === secret || querySecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY env var" }, { status: 500 });
  }

  const pool = getDbPool();

  try {
    const result = await pool.query<{ question: string; answer: string }>(
      "select question, answer from work_manual_questions order by created_at desc limit $1",
      [MAX_QUESTIONS]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: "집계할 질문 로그가 없습니다." });
    }

    let logText = result.rows
      .map((row, i) => `${i + 1}. Q: ${row.question}\n   A: ${row.answer}`)
      .join("\n");
    if (logText.length > MAX_PROMPT_CHARS) {
      logText = logText.slice(0, MAX_PROMPT_CHARS) + "\n(이하 생략)";
    }

    const prompt = `아래는 사내 업무매뉴얼 챗봇에 최근 사용자들이 실제로 물어본 질문과 답변 로그입니다.

━━━ 질문/답변 로그 ━━━
${logText}
━━━━━━━━━━━━━━━━━

이 로그를 분석해서 자주 묻는 질문(FAQ) 상위 15개를 뽑아주세요.

규칙:
1. 표현만 다르고 같은 의도인 질문(예: "최저임금이 얼마야?"와 "최저임금 얼마인가요?")은 하나로 합쳐서 세어주세요.
2. 각 그룹에서 가장 자연스러운 대표 질문 문장 하나를 question으로 만드세요.
3. answer에는 로그에 있던 답변 중 가장 정확하고 완전한 답변을 골라 담으세요(새로 지어내지 마세요).
4. count는 그 그룹에 속한 질문이 로그에 몇 번 등장했는지입니다.
5. 등장 빈도가 높은 순서로 정렬하고, 최대 15개까지만 반환하세요. 로그에 서로 다른 주제가 15개 미만이면 그 개수만큼만 반환하세요.
6. 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트나 마크다운 코드 블록은 포함하지 마세요.

[{"question": "...", "answer": "...", "count": 3}, ...]`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const result2 = await withGeminiFallback(genAI, (model) =>
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      })
    );

    let raw = result2.response.text().trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    const entries = JSON.parse(raw) as FaqEntry[];
    if (!Array.isArray(entries)) throw new Error("AI 응답이 배열 형식이 아닙니다.");

    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("delete from work_manual_faq");
      for (let i = 0; i < entries.length && i < 15; i++) {
        const entry = entries[i];
        await client.query(
          `insert into work_manual_faq (rank, question, answer, ask_count) values ($1, $2, $3, $4)`,
          [i + 1, entry.question, entry.answer, entry.count ?? 0]
        );
      }
      await client.query("commit");
    } catch (txError) {
      await client.query("rollback");
      throw txError;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true, updated: Math.min(entries.length, 15), analyzed: result.rows.length });
  } catch (error) {
    console.error("[work-manual/faq-update] 집계 실패:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    if (isOverloadedError(error)) {
      return NextResponse.json(
        { error: "AI 서버가 일시적으로 혼잡합니다. 잠시(1~2분) 후 다시 시도해주세요." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: `FAQ 집계 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
