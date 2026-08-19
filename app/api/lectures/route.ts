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

export type LectureStage = "개념정리" | "핵심원리" | "문제풀이" | "응용예제";
export const LECTURE_STAGES: LectureStage[] = ["개념정리", "핵심원리", "문제풀이", "응용예제"];

export interface LectureSlide {
  heading: string;
  stage: LectureStage;
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

    const prompt = `당신은 대한민국 최고의 '1타 강사'입니다. 지금부터 업로드된 자료를 가지고 중학생을 대상으로 한 강의 슬라이드와 내레이션 대본을 만듭니다. 지루하고 어렵게 느껴질 수 있는 내용을 학생들이 "아! 이래서 이런 거구나"하고 무릎을 탁 치게 만드는, 재미있고 몰입도 높은 1타 강사 스타일 강의를 만드는 게 목표입니다.

━━━ 자료 내용 ━━━
${text}
━━━━━━━━━━━━━━━━━

[강의 대상]
중학생. 어려운 용어는 쉬운 말로 풀어서 설명하고, 배경지식이 없어도 처음부터 따라올 수 있게 친절하게 설명하세요.

[강의 말투 — 1타 강사 스타일]
- "얘들아", "자, 여기서 중요한 게 나옵니다", "이거 시험에 진짜 잘 나와요", "여기서 많이 틀려요" 같은 실제 인강 선생님 말투를 사용하세요.
- 딱딱한 설명 대신 비유, 예시, 학생들이 헷갈려하는 포인트를 짚어주며 리듬감 있게 설명하세요.
- narration은 대본 낭독이 아니라 진짜 강의하듯 구어체로, 학생에게 직접 말을 거는 톤으로 작성하세요.

[강의 구성 — 자료에 나오는 개념 단위로 아래 4단계 사이클을 반복]
자료에 있는 각 핵심 개념마다 다음 4단계 슬라이드를 순서대로 만드세요. 한 개념의 4단계가 끝나면 다음 개념으로 넘어가는 방식으로, 자료의 모든 개념을 빠짐없이 다루세요 (개념이 많으면 슬라이드도 자연히 늘어납니다 — 개수를 미리 제한하지 마세요).

1. 개념정리 (stage: "개념정리") — 이 개념이 무엇인지, 왜 배우는지, 핵심 정의를 명확히 정리
2. 핵심원리 (stage: "핵심원리") — 그 개념이 성립하는 이유·원리를 학생이 "왜 그런지" 이해하도록 설명 (공식이 있다면 공식이 나온 이유까지)
3. 문제풀이 (stage: "문제풀이") — 그 개념/원리를 실제로 적용하는 예제 문제를 하나 이상 만들고, 손으로 풀어주듯 단계별로 풀이 과정을 설명 (자료에 예제/문제가 있으면 그것을 활용하고, 없으면 개념 수준에 맞는 전형적인 문제를 직접 만들어서 사용)
4. 응용예제 (stage: "응용예제") — 이 개념이 실생활이나 다른 문제 유형에서 어떻게 쓰이는지, 앞의 문제풀이와 어떻게 연결되는지 짚어주며 마무리

각 슬라이드마다:
- heading: 슬라이드 제목 (예: "일차방정식이 뭘까?", "왜 양변에 같은 수를 더해도 될까?", "실전 문제로 풀어보자", "실생활에서는 이렇게 쓰여요" 처럼 그 슬라이드의 역할이 드러나게)
- stage: 위 4단계 중 정확히 하나 ("개념정리" | "핵심원리" | "문제풀이" | "응용예제")
- bullets: 화면에 보여줄 핵심 요점 3~6개. 문제풀이 단계에서는 풀이 과정을 단계별 문장으로 나눠서 적으세요 (예: "① 양변에서 3을 뺀다", "② 양변을 2로 나눈다")
- narration: 실제 강의하듯 구어체로 5~9문장 이상 충분히 상세하게 설명. 문제풀이 단계에서는 풀이 과정을 왜 그렇게 하는지 이유까지 짚어가며 천천히 설명하세요.

규칙:
1. 자료에 있는 내용에 근거해서 개념을 뽑되, 문제풀이·응용예제 단계에서는 학생 이해를 돕기 위해 자료 수준에 맞는 예제를 직접 만들어서 사용해도 됩니다.
2. 자료의 개념을 생략하지 말고 순서대로 빠짐없이 다루세요.
3. 다른 설명 없이 아래 JSON 형식으로만 응답하세요. 마크다운 코드 블록도 포함하지 마세요.

{"title": "강의 제목", "slides": [{"heading": "...", "stage": "개념정리", "bullets": ["...", "..."], "narration": "..."}]}`;

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
      stage: LECTURE_STAGES.includes(s.stage) ? s.stage : "개념정리",
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
