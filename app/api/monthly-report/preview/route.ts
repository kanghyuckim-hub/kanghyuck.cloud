import { NextRequest, NextResponse } from "next/server";
import { parseDataFile } from "@/lib/parseDataFile";

const MAX_PREVIEW_CHARS = 8000;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dataFile = formData.get("dataFile") as File | null;

    if (!dataFile) {
      return NextResponse.json({ error: "데이터 파일이 필요합니다." }, { status: 400 });
    }

    const text = await parseDataFile(dataFile);
    const truncated = text.length > MAX_PREVIEW_CHARS;

    return NextResponse.json({
      preview: text.slice(0, MAX_PREVIEW_CHARS),
      truncated,
    });
  } catch (error) {
    console.error("데이터 파일 미리보기 오류:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: `파일을 읽는 중 오류가 발생했습니다: ${message}` }, { status: 500 });
  }
}
