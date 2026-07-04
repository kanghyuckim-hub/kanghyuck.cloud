import { NextResponse } from "next/server";
import { watchInbox } from "@/lib/gmail";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  const querySecret = new URL(request.url).searchParams.get("secret");

  return headerSecret === secret || querySecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const topicName = process.env.GOOGLE_PUBSUB_TOPIC;
  if (!topicName) {
    return NextResponse.json({ error: "Missing GOOGLE_PUBSUB_TOPIC env var" }, { status: 500 });
  }

  try {
    const result = await watchInbox(topicName);
    console.log("[gmail-renew-watch] watch renewed:", result);
    return NextResponse.json({ ok: true, historyId: result.historyId, expiration: result.expiration });
  } catch (err) {
    console.error("[gmail-renew-watch] failed to renew watch", err);
    return NextResponse.json({ error: "failed to renew watch" }, { status: 502 });
  }
}
