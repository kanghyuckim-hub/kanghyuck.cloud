import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";
import { isOverloadedError, withGeminiFallback } from "@/lib/gemini";

export const maxDuration = 60;

const MAX_QA_ENTRIES = 200;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = await getSessionMember();
  if (!member || (member.role !== "master" && member.role !== "admin")) {
    return NextResponse.json({ error: "매뉴얼 업데이트 권한이 없습니다." }, { status: 403 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  const pool = getDbPool();

  try {
    const manualResult = await pool.query<{ file_name: string; content_text: string }>(
      "select file_name, content_text from work_manuals where id = $1",
      [id]
    );
    const manual = manualResult.rows[0];
    if (!manual) {
      return NextResponse.json({ error: "매뉴얼을 찾을 수 없습니다." }, { status: 404 });
    }

    const qaResult = await pool.query<{ question: string; answer: string }>(
      `select question, answer from work_manual_questions
       where source_file = $1
       order by created_at desc
       limit $2`,
      [manual.file_name, MAX_QA_ENTRIES]
    );

    if (qaResult.rows.length === 0) {
      return NextResponse.json(
        { error: "이 매뉴얼과 관련해서 반영할 질문/답변 기록이 없습니다." },
        { status: 400 }
      );
    }

    const qaText = qaResult.rows.map((row, i) => `${i + 1}. Q: ${row.question}\n   A: ${row.answer}`).join("\n");

    const prompt = `당신은 사내 업무매뉴얼을 관리하는 편집자입니다.

아래는 기존 매뉴얼 원문과, 실제 사용자들이 이 매뉴얼에 대해 질문하고 받은 답변 기록입니다.
질문/답변 기록을 참고해서 매뉴얼을 더 명확하고 완전하게 다듬어주세요.

━━━ 기존 매뉴얼 원문 (${manual.file_name}) ━━━
${manual.content_text}
━━━━━━━━━━━━━━━━━

━━━ 사용자 질문/답변 기록 ━━━
${qaText}
━━━━━━━━━━━━━━━━━

규칙:
1. 기존 매뉴얼의 모든 정보를 빠짐없이 유지하세요. 임의로 삭제하지 마세요.
2. 질문/답변에서 나온 내용 중 기존 매뉴얼에 명확히 설명되어 있지 않던 부분은 관련 섹션에 자연스럽게 보완하세요.
3. 문서 마지막에 "## 자주 묻는 질문 보완" 섹션을 추가해서, 매뉴얼 본문만으로는 답하기 어려웠던 질문과 답변을 정리하세요.
4. 마크다운(Markdown) 형식으로 작성하세요. 제목, 목록, 표 등을 적절히 사용해 가독성 있게 구성하세요.
5. 마크다운 본문만 반환하세요. 다른 설명이나 코드 블록 표시(\`\`\`)는 포함하지 마세요.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const result = await withGeminiFallback(genAI, (model) =>
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
      })
    );

    let updatedMarkdown = result.response.text().trim();
    updatedMarkdown = updatedMarkdown.replace(/^```(markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const baseName = manual.file_name.replace(/\.pdf$/i, "");
    const dateStr = new Date().toISOString().slice(0, 10);
    const newFileName = `${baseName}_업데이트본_${dateStr}.md`;

    const blob = await put(newFileName, updatedMarkdown, {
      access: "public",
      addRandomSuffix: true,
      contentType: "text/markdown; charset=utf-8",
    });

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);

    const insertResult = await pool.query<{ id: string; created_at: string }>(
      `insert into work_manuals (file_name, blob_url, content_text, uploaded_by)
       values ($1, $2, $3, $4)
       returning id, created_at`,
      [newFileName, blob.url, updatedMarkdown, isUuid ? member.id : null]
    );

    return NextResponse.json({
      manual: {
        id: insertResult.rows[0].id,
        fileName: newFileName,
        blobUrl: blob.url,
        createdAt: insertResult.rows[0].created_at,
      },
      basedOnQaCount: qaResult.rows.length,
    });
  } catch (error) {
    console.error("업무매뉴얼 업데이트본 생성 오류:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    if (isOverloadedError(error)) {
      return NextResponse.json(
        { error: "AI 서버가 일시적으로 혼잡합니다. 잠시(1~2분) 후 다시 시도해주세요." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: `업데이트본 생성 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
