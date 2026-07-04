import { NextResponse } from "next/server";
import { verifyPubSubPushRequest } from "@/lib/google-auth";
import { listNewMessageIds, getMessage } from "@/lib/gmail";

export const runtime = "nodejs";

interface PubSubPushBody {
  message?: {
    data?: string;
    messageId?: string;
  };
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  // Pub/Sub push 구독 생성 시 audience를 이 엔드포인트의 공개 URL로 지정해야 한다.
  const audience = process.env.PUBSUB_PUSH_AUDIENCE || new URL(request.url).origin + "/api/gmail-webhook";

  const isAuthentic = await verifyPubSubPushRequest(authorization, audience);
  if (!isAuthentic) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PubSubPushBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const data = body.message?.data;
  if (!data) {
    return NextResponse.json({ ok: true });
  }

  let decoded: { emailAddress?: string; historyId?: string | number };
  try {
    decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (!decoded.historyId) {
    return NextResponse.json({ ok: true });
  }

  try {
    const messageIds = await listNewMessageIds(String(decoded.historyId));
    for (const id of messageIds) {
      const message = await getMessage(id);
      console.log("[gmail-webhook] new message received:", {
        id: message.id,
        snippet: message.snippet,
        historyId: message.historyId,
      });
      // TODO: 여기서 DB 저장 등 후속 처리를 이어갈 수 있다.
    }
  } catch (err) {
    // startHistoryId가 너무 오래되어 만료된 경우(404) 등은 재구독으로 복구해야 하므로
    // 로그만 남기고 Pub/Sub에는 200을 반환해 불필요한 재전송을 막는다.
    console.error("[gmail-webhook] failed to process history", err);
  }

  return NextResponse.json({ ok: true });
}
