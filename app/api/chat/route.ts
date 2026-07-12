import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const message = body?.message;

  if (!message) {
    return errorResponse("메시지가 필요합니다", 400);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error(
      "Gemini API 키가 설정되지 않았습니다. .env.local에 GEMINI_API_KEY 를 설정하세요."
    );
    return errorResponse("API 키가 설정되지 않았습니다", 500);
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  let geminiStream: AsyncGenerator<{ text: () => string }>;
  try {
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    });
    geminiStream = result.stream;
  } catch (error) {
    console.error("Gemini API 오류:", error);
    const msg = error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다";
    const status =
      typeof error === "object" && error !== null && "status" in error && typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;
    return errorResponse(msg, status);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of geminiStream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (error) {
        console.error("Gemini 스트리밍 오류:", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
