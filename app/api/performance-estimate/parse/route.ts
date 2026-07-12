import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseDataBuffer } from "@/lib/parseDataFile";

export const maxDuration = 60;

const MAX_TEXT_CHARS = 100000;

export interface ProjectRecord {
  organization: string;
  projectName: string;
  contractAmount: number;
  totalEstimatedCost: number;
  actualCostIncurred: number;
  plannedDurationDays: number;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "파일이 필요합니다." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    let text = await parseDataBuffer(buffer);
    if (!text.trim()) {
      return NextResponse.json({ success: false, error: "파일에서 텍스트를 추출하지 못했습니다." }, { status: 400 });
    }
    if (text.length > MAX_TEXT_CHARS) {
      text = text.slice(0, MAX_TEXT_CHARS) + "\n\n(이하 데이터는 길이 제한으로 생략됨)";
    }

    const prompt = `당신은 건축설계업 실적 데이터를 분석하는 도우미입니다.

아래는 업로드된 실적 파일에서 추출한 텍스트입니다. 이 파일에는 진행율(진행기준) 매출 계산에 필요한 여러 프로젝트의 정보가 담겨 있습니다.

━━━ 파일 내용 ━━━
${text}
━━━━━━━━━━━━━━━━━

파일에 있는 모든 프로젝트를 빠짐없이 찾아서, 각 프로젝트마다 아래 정보를 추출하세요:
- organization: 조직/부서/팀 명 (없으면 "미분류")
- projectName: 프로젝트명
- contractAmount: 계약금액 (숫자만)
- totalEstimatedCost: 총예정원가 (숫자만)
- actualCostIncurred: 실투입원가 (현재까지 투입된 원가, 숫자만)
- plannedDurationDays: 총 계약기간(일수). 착수일/종료일(예정)이 있으면 그 차이로 계산. 알 수 없으면 180.

규칙:
1. 금액의 단위(원/천원/백만원)를 파일에서 파악해서 unit 필드에 "원", "천원", "백만원" 중 하나로 표기하고, 모든 금액은 그 단위 기준 숫자로 반환하세요. 단위를 알 수 없으면 "원"으로 가정하세요.
2. 값을 알 수 없는 필드는 0으로 두되, 추측 가능한 값은 최대한 채우세요.
3. 다른 설명 없이 아래 JSON 형식으로만 응답하세요.

{"unit": "백만원", "projects": [{"organization": "...", "projectName": "...", "contractAmount": 0, "totalEstimatedCost": 0, "actualCostIncurred": 0, "plannedDurationDays": 0}]}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    });

    let raw = result.response.text().trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: { unit?: string; projects?: ProjectRecord[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ success: false, error: "AI가 반환한 데이터를 해석하지 못했습니다. 파일 내용을 확인해주세요." }, { status: 502 });
    }

    if (!Array.isArray(parsed.projects) || parsed.projects.length === 0) {
      return NextResponse.json({ success: false, error: "파일에서 프로젝트 정보를 찾지 못했습니다." }, { status: 400 });
    }

    const projects: ProjectRecord[] = parsed.projects.map((p) => ({
      organization: p.organization || "미분류",
      projectName: p.projectName || "프로젝트",
      contractAmount: Number(p.contractAmount) || 0,
      totalEstimatedCost: Number(p.totalEstimatedCost) || 0,
      actualCostIncurred: Number(p.actualCostIncurred) || 0,
      plannedDurationDays: Number(p.plannedDurationDays) || 180,
    }));

    return NextResponse.json({ success: true, unit: parsed.unit || "원", projects });
  } catch (error) {
    console.error("실적추정 파일 분석 오류:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ success: false, error: `파일 분석 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
