import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const CLAUDE_MODEL = "claude-opus-5";

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

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "Anthropic API 키가 설정되지 않았습니다. .env.local에 ANTHROPIC_API_KEY 를 설정하세요."
    );
    return errorResponse("API 키가 설정되지 않았습니다", 500);
  }

  const client = new Anthropic();
  const claudeStream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
    messages: [{ role: "user", content: message }],
  });

  // 첫 이벤트를 미리 받아 인증/요청 오류는 스트림 시작 전에 JSON 에러로 응답한다.
  const events = claudeStream[Symbol.asyncIterator]();
  let firstEvent;
  try {
    firstEvent = await events.next();
  } catch (error) {
    console.error("Claude API 오류:", error);
    const msg = error instanceof Anthropic.APIError ? error.message : "요청 처리 중 오류가 발생했습니다";
    const status = error instanceof Anthropic.APIError && error.status ? error.status : 500;
    return errorResponse(msg, status);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let result = firstEvent;
        while (!result.done) {
          const event = result.value;
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
          result = await events.next();
        }
      } catch (error) {
        console.error("Claude 스트리밍 오류:", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
