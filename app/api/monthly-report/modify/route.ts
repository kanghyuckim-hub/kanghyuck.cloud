import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { html, command } = await request.json();

    if (!html || !command) {
      return NextResponse.json({ error: "html과 command가 필요합니다." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `당신은 HTML 보고서 디자이너입니다.

아래 HTML 보고서에 다음 디자인 수정 요청을 적용해주세요.

수정 요청: "${command}"

규칙:
1. 보고서의 데이터와 텍스트 내용은 절대 변경하지 마세요. 오직 스타일(색상, 폰트, 레이아웃, 간격 등)만 수정하세요.
2. 완전한 HTML 문서(<!DOCTYPE html>부터 </html>까지)를 반환하세요.
3. HTML 코드만 반환하세요. 마크다운 코드 블록(\`\`\`html)이나 부가 설명은 포함하지 마세요.
4. 모든 스타일은 인라인 스타일 또는 <style> 태그를 사용하세요.

━━━ 기존 HTML ━━━
${html}
━━━━━━━━━━━━━━━━`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    });

    let modified = result.response.text();

    modified = modified
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (!modified.startsWith("<!DOCTYPE") && !modified.startsWith("<html") && !modified.startsWith("<HTML")) {
      modified = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${modified}</body></html>`;
    }

    return NextResponse.json({ html: modified });
  } catch (error) {
    console.error("보고서 수정 오류:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `보고서 수정 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
