import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDbPool } from "@/lib/db";

export const maxDuration = 60;

// Gemini 2.5 Flash 무료 등급의 분당 입력 토큰 한도(250,000)를 넘지 않도록 안전하게 제한
const MAX_MANUAL_TEXT_CHARS = 100000;

interface ChatTurn {
  question: string;
  answer: string;
}

interface AskResponse {
  answer: string;
  found: boolean;
  sourceFile: string | null;
  sourceExcerpt: string | null;
}

export async function POST(request: NextRequest) {
  const { question, history } = (await request.json()) as {
    question?: string;
    history?: ChatTurn[];
  };
  if (!question?.trim()) {
    return NextResponse.json({ error: "질문을 입력해주세요." }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const pool = getDbPool();
    const result = await pool.query<{ file_name: string; content_text: string }>(
      "select file_name, content_text from work_manuals order by created_at desc"
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        answer: "등록된 업무매뉴얼이 없습니다. 먼저 매뉴얼 파일을 업로드해주세요.",
        found: false,
        sourceFile: null,
        sourceExcerpt: null,
      } satisfies AskResponse);
    }

    let manualsText = result.rows
      .map((row) => `### 파일: ${row.file_name}\n${row.content_text}`)
      .join("\n\n");
    if (manualsText.length > MAX_MANUAL_TEXT_CHARS) {
      manualsText = manualsText.slice(0, MAX_MANUAL_TEXT_CHARS) + "\n\n(이하 매뉴얼 내용은 길이 제한으로 생략됨)";
    }

    const historyText = (history ?? [])
      .slice(-5)
      .map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`)
      .join("\n\n");

    const prompt = `당신은 사내 업무매뉴얼을 기반으로 답변하는 도우미입니다.

━━━ 업무매뉴얼 내용 ━━━
${manualsText}
━━━━━━━━━━━━━━━━━

${historyText ? `━━━ 이전 대화 ━━━\n${historyText}\n━━━━━━━━━━━━━━━━━\n\n` : ""}사용자 질문: ${question}

규칙:
1. 반드시 위 매뉴얼 내용에 근거해서만 답변하세요. 매뉴얼에 없는 내용은 추측하지 말고 모른다고 답하세요.
2. 답변의 근거가 된 매뉴얼 원문을 그대로(요약하지 말고) 짧게 발췌해서 sourceExcerpt에 담으세요.
3. 아래 JSON 형식으로만 응답하세요. 다른 텍스트나 마크다운 코드 블록은 포함하지 마세요.

{"answer": "질문에 대한 답변", "found": true 또는 false, "sourceFile": "근거가 된 파일명 또는 null", "sourceExcerpt": "매뉴얼 원문 발췌 또는 null"}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const result2 = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    });

    let raw = result2.response.text().trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      raw = raw.slice(jsonStart, jsonEnd + 1);
    }

    let parsed: AskResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const answerMatch = raw.match(/"answer"\s*:\s*"((?:\\.|[^"\\])*)"/);
      parsed = {
        answer: answerMatch
          ? JSON.parse(`"${answerMatch[1]}"`)
          : "답변을 생성했지만 형식이 올바르지 않아 표시할 수 없습니다. 다시 질문해주세요.",
        found: false,
        sourceFile: null,
        sourceExcerpt: null,
      };
    }

    try {
      await pool.query(
        "insert into work_manual_questions (question, answer, source_file) values ($1, $2, $3)",
        [question, parsed.answer, parsed.sourceFile]
      );
    } catch (logError) {
      console.error("업무매뉴얼 질문 로그 저장 실패:", logError);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("업무매뉴얼 질의응답 오류:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      return NextResponse.json(
        { error: "AI 사용량이 일시적으로 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: `답변 생성 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
