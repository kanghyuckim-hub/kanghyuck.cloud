import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchAndParseDataFile } from "@/lib/parseDataFile";
import { isOverloadedError, withGeminiFallback } from "@/lib/gemini";

export const maxDuration = 60;

// Gemini 2.5 Flash 무료 등급의 분당 입력 토큰 한도(250,000)를 넘지 않도록 안전하게 제한
// (Vercel Hobby 플랜의 maxDuration 60초 안에 끝내기 위해 여유있게 제한)
const MAX_DATA_TEXT_CHARS = 50000;

// maxDuration(60초)을 넘기면 Vercel이 함수를 강제 종료해서 JSON이 아닌 플랫폼
// 오류 페이지를 반환하므로, 그보다 먼저 우리가 요청을 중단하고 깔끔한 에러를 내려준다.
const GEMINI_TIMEOUT_MS = 50000;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dataFileUrl = formData.get("dataFileUrl") as string | null;
    const dataFileType = formData.get("dataFileType") as string | null;
    const designFile = formData.get("designFile") as File | null;

    if (!dataFileUrl || !dataFileType) {
      return NextResponse.json({ error: "데이터 파일이 필요합니다." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." }, { status: 500 });
    }

    // 1. Parse data file content (uploaded to Blob storage by the client)
    let dataText = await fetchAndParseDataFile(dataFileUrl);
    if (dataText.length > MAX_DATA_TEXT_CHARS) {
      dataText = dataText.slice(0, MAX_DATA_TEXT_CHARS) + "\n\n(이하 데이터는 길이 제한으로 생략됨)";
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const commonRules = `
생성 규칙:
1. <!DOCTYPE html>부터 시작하는 완전한 HTML 문서를 작성하세요.
2. 모든 스타일은 인라인 스타일(style="...") 또는 <style> 태그를 사용하세요. 외부 CDN은 사용하지 마세요.
3. 한국어로 작성하세요.
4. 데이터를 표, KPI 카드, 바 차트(HTML/CSS로 구현), 전월 대비 증감률 등으로 시각적으로 표현하세요.
5. 전문적이고 인쇄 가능한 보고서 형태로 만드세요. 너비는 A4 기준(800px 내외)으로 구성하세요.
6. HTML 코드만 반환하세요. 마크다운 코드 블록(\`\`\`html)이나 부가 설명은 포함하지 마세요.
7. 매우 중요: 원본 데이터의 모든 행을 표에 그대로 나열하지 마세요. 프로젝트/부서 단위로 집계하거나 최근 12개월 정도로 요약해서, 표는 핵심 항목 위주로 간결하게(각 표 15행 이내) 구성하세요. 출력 길이 제한 때문에 보고서가 중간에 잘리지 않는 것이 표를 빠짐없이 나열하는 것보다 훨씬 중요합니다.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    let result;

    if (designFile) {
      // ── 디자인 샘플 있음: 비전 모드 ──────────────────────────────
      const supportedVisionTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "application/pdf"];
      if (!supportedVisionTypes.includes(designFile.type)) {
        return NextResponse.json({ error: "지원하지 않는 디자인 파일 형식입니다. PNG, JPG, PDF를 사용하세요." }, { status: 400 });
      }

      const designBuffer = await designFile.arrayBuffer();
      const designBase64 = Buffer.from(designBuffer).toString("base64");

      const promptWithDesign = `당신은 전문 보고서 디자이너입니다.

첨부된 디자인 샘플의 레이아웃, 색상 팔레트, 폰트 스타일, 섹션 구성, 전반적인 분위기를 세밀하게 분석하세요.
그리고 아래 실적 데이터를 담아 동일한 디자인 스타일의 월간실적보고서 HTML을 생성해주세요.

━━━ 실적 데이터 ━━━
${dataText}
━━━━━━━━━━━━━━━━━
${commonRules}
4-1. 디자인 샘플의 색상, 레이아웃, 섹션 구조를 최대한 반영하세요.`;

      result = await withGeminiFallback(genAI, (model) =>
        model.generateContent(
          {
            contents: [{
              role: "user",
              parts: [
                { text: promptWithDesign },
                {
                  inlineData: {
                    mimeType: designFile.type as "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "application/pdf",
                    data: designBase64,
                  },
                },
              ],
            }],
            generationConfig: { temperature: 0.35, maxOutputTokens: 8192 },
          },
          { signal: controller.signal }
        )
      );
    } else {
      // ── 디자인 샘플 없음: AI 자체 디자인 ────────────────────────
      const promptAutoDesign = `당신은 전문 보고서 디자이너입니다.

아래 실적 데이터를 분석하여 세련되고 전문적인 월간실적보고서 HTML을 직접 디자인해서 생성해주세요.

━━━ 실적 데이터 ━━━
${dataText}
━━━━━━━━━━━━━━━━━

디자인 가이드 (자유롭게 해석하세요):
- 색상: 네이비(#1e3a5f), 블루(#2563eb) 계열의 전문적인 팔레트를 권장합니다.
- 레이아웃: 상단 헤더 → KPI 요약 카드 → 데이터 테이블 → 차트/그래프 → 분석 코멘트 순서를 권장합니다.
- KPI 카드는 주요 지표(매출, 영업이익, 순이익 등)를 큰 숫자로 강조하고 전월 대비 증감을 색상(상승=초록, 하락=빨강)으로 표시하세요.
- 바 차트는 순수 HTML/CSS(div 높이 비율)로 구현하세요.
- 보고서 상단에 회사명/기간 등 헤더 정보를 포함하세요.
${commonRules}`;

      result = await withGeminiFallback(genAI, (model) =>
        model.generateContent(
          {
            contents: [{
              role: "user",
              parts: [{ text: promptAutoDesign }],
            }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 8192 },
          },
          { signal: controller.signal }
        )
      );
    }

    clearTimeout(timeoutId);

    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      return NextResponse.json(
        { error: "데이터 양이 많아 보고서 생성 도중 응답이 잘렸습니다. 데이터 파일의 기간/항목을 줄여서 다시 시도해주세요." },
        { status: 502 }
      );
    }

    let html = result.response.text();

    // Strip markdown code fences if present
    html = html
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Ensure it starts with a valid HTML tag
    if (!html.startsWith("<!DOCTYPE") && !html.startsWith("<html") && !html.startsWith("<HTML")) {
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${html}</body></html>`;
    }

    return NextResponse.json({ html });
  } catch (error) {
    console.error("월간보고서 생성 오류:", error);
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "보고서 생성이 시간 제한을 초과했습니다. 데이터 파일 크기를 줄이거나, 디자인 샘플 없이 다시 시도해주세요." },
        { status: 504 }
      );
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      return NextResponse.json(
        { error: "AI 사용량이 일시적으로 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }
    if (message.toLowerCase().includes("document has no pages")) {
      return NextResponse.json(
        { error: "업로드하신 디자인 샘플 PDF를 읽지 못했습니다 (손상되었거나 암호가 걸려있을 수 있습니다). 다른 PDF를 사용하거나 PNG/JPG 이미지로 다시 시도해주세요." },
        { status: 400 }
      );
    }
    if (isOverloadedError(error)) {
      return NextResponse.json(
        { error: "AI 서버가 일시적으로 혼잡합니다. 잠시(1~2분) 후 다시 시도해주세요." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: `보고서 생성 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
