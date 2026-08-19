import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDbPool } from "@/lib/db";
import { getSessionMember } from "@/lib/auth";
import { fetchAndParseDataFile } from "@/lib/parseDataFile";
import { isOverloadedError, withGeminiFallback } from "@/lib/gemini";
import { DEFAULT_LECTURE_CHARACTER, isValidCharacterKey } from "@/lib/lectureCharacters";

export const maxDuration = 60;

const MAX_TEXT_CHARS = 100000;
const GEMINI_TIMEOUT_MS = 50000;

export interface LectureSlide {
  heading: string;
  bullets: string[];
  narration: string;
}

export interface LectureListItem {
  id: string;
  fileName: string;
  title: string;
  characterKey: string;
  slideCount: number;
  createdAt: string;
}

export async function GET() {
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
      "select id, file_name, title, character_key, slides, created_at from lectures order by created_at desc"
    );
    const lectures: LectureListItem[] = result.rows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      title: row.title,
      characterKey: row.character_key,
      slideCount: Array.isArray(row.slides) ? row.slides.length : 0,
      createdAt: row.created_at,
    }));
    return NextResponse.json({ lectures });
  } catch (error) {
    console.error("강의 목록 조회 오류:", error);
    return NextResponse.json({ error: "강의 목록을 불러오는 중 오류가 발생했습니다.", lectures: [] });
  }
}

export async function POST(request: NextRequest) {
  const member = await getSessionMember();
  if (!member || (member.role !== "master" && member.role !== "admin")) {
    return NextResponse.json({ error: "강의 등록 권한이 없습니다." }, { status: 403 });
  }

  const { blobUrl, fileName, characterKey } = (await request.json()) as {
    blobUrl?: string;
    fileName?: string;
    characterKey?: string;
  };
  if (!blobUrl || !fileName) {
    return NextResponse.json({ error: "파일 정보가 필요합니다." }, { status: 400 });
  }
  const resolvedCharacterKey =
    characterKey && isValidCharacterKey(characterKey) ? characterKey : DEFAULT_LECTURE_CHARACTER;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    let text = await fetchAndParseDataFile(blobUrl);
    if (!text.trim()) {
      return NextResponse.json({ error: "파일에서 텍스트를 추출하지 못했습니다." }, { status: 400 });
    }
    if (text.length > MAX_TEXT_CHARS) {
      text = text.slice(0, MAX_TEXT_CHARS) + "\n\n(이하 내용은 길이 제한으로 생략됨)";
    }

    const prompt = `당신은 업로드된 자료를 바탕으로 동물 캐릭터 선생님이 진행하는 강의 슬라이드와 내레이션 대본을 만드는 도우미입니다.

━━━ 자료 내용 ━━━
${text}
━━━━━━━━━━━━━━━━━

이 자료를 빠짐없이 이해하기 쉬운 강의로 재구성하세요. 자료에 있는 모든 주요 섹션/챕터/소제목/항목을 하나도 빠뜨리지 말고 각각 최소 1개 이상의 슬라이드로 다루세요. 슬라이드 수는 미리 정해두지 말고 자료 분량에 맞게 자연스럽게 늘리세요 (짧은 자료는 6~10장, 내용이 많은 자료는 15~30장 이상이 될 수도 있습니다). 요약만 하지 말고, 자료에 나온 구체적인 수치·조건·절차·예외사항·용어 정의까지 실제로 설명하세요.

각 슬라이드마다:
- heading: 슬라이드 제목 (해당 부분의 주제를 명확히 드러내는 짧은 제목)
- bullets: 화면에 보여줄 핵심 요점 3~6개. 자료 원문의 구체적인 수치/조건/절차를 포함해서 최대한 자세하게 작성 (뭉뚱그린 요약 문장 금지)
- narration: 선생님 캐릭터가 실제로 강의하듯이 읽어줄 내레이션 대본. bullets 내용을 자연스러운 구어체 한국어로 풀어 설명하되, 왜 그런지/어떤 경우에 해당하는지 등 맥락과 예시까지 곁들여 5~9문장 정도로 충분히 상세하게 작성하세요.

규칙:
1. 자료에 있는 내용에 근거해서만 작성하세요. 없는 내용을 지어내지 마세요.
2. 자료의 특정 섹션을 생략하거나 뭉뚱그리지 말고, 순서대로 빠짐없이 슬라이드에 반영하세요.
3. 다른 설명 없이 아래 JSON 형식으로만 응답하세요. 마크다운 코드 블록도 포함하지 마세요.

{"title": "강의 제목", "slides": [{"heading": "...", "bullets": ["...", "..."], "narration": "..."}]}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    const result = await withGeminiFallback(genAI, (model) =>
      model.generateContent(
        {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 32768 },
        },
        { signal: controller.signal }
      )
    );

    clearTimeout(timeoutId);

    if (result.response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      return NextResponse.json(
        { error: "자료 분량이 많아 강의 생성 도중 응답이 잘렸습니다. 파일을 나눠서 업로드해주세요." },
        { status: 502 }
      );
    }

    let raw = result.response.text().trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: { title?: string; slides?: LectureSlide[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI가 반환한 강의 내용을 해석하지 못했습니다. 파일 내용을 확인해주세요." }, { status: 502 });
    }

    if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      return NextResponse.json({ error: "자료에서 강의 슬라이드를 생성하지 못했습니다." }, { status: 400 });
    }

    const slides: LectureSlide[] = parsed.slides.map((s) => ({
      heading: s.heading || "",
      bullets: Array.isArray(s.bullets) ? s.bullets.map(String) : [],
      narration: s.narration || "",
    }));
    const title = parsed.title?.trim() || fileName;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);

    const pool = getDbPool();
    const insertResult = await pool.query<{ id: string; created_at: string }>(
      `insert into lectures (file_name, blob_url, title, character_key, slides, uploaded_by)
       values ($1, $2, $3, $4, $5, $6)
       returning id, created_at`,
      [fileName, blobUrl, title, resolvedCharacterKey, JSON.stringify(slides), isUuid ? member.id : null]
    );

    return NextResponse.json({
      lecture: {
        id: insertResult.rows[0].id,
        fileName,
        title,
        characterKey: resolvedCharacterKey,
        slideCount: slides.length,
        createdAt: insertResult.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("강의 등록 오류:", error);
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "강의 생성이 시간 제한을 초과했습니다. 파일 크기를 줄여서 다시 시도해주세요." },
        { status: 504 }
      );
    }
    if (isOverloadedError(error)) {
      return NextResponse.json(
        { error: "AI 서버가 일시적으로 혼잡합니다. 잠시(1~2분) 후 다시 시도해주세요." },
        { status: 503 }
      );
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `강의 등록 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
