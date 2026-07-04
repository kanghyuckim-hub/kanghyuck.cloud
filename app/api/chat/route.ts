import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "메시지가 필요합니다" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error(
        'Gemini API 키가 설정되지 않았습니다. .env.local에 GEMINI_API_KEY 를 설정하세요.'
      );
      return NextResponse.json(
        { error: "API 키가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = "gemini-2.5-flash";
    console.log('Calling Gemini model:', modelName);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    });
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("Gemini API 오류:", error);

    let message = "요청 처리 중 오류가 발생했습니다";
    let status = 500;

    if (error instanceof Error) {
      message = error.message;
    }

    if (typeof error === "object" && error !== null && "status" in error) {
      const statusValue = (error as any).status;
      if (typeof statusValue === "number") {
        status = statusValue;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
