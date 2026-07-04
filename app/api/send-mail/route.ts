import { NextResponse } from "next/server";
import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { to?: string; subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const to = body.to?.trim();
  const subject = body.subject?.trim();
  const text = body.body?.trim();

  if (!to || !subject || !text) {
    return NextResponse.json({ error: "받는 사람, 제목, 내용을 모두 입력해주세요." }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(to)) {
    return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { error: "서버 환경변수(RESEND_API_KEY / CONTACT_FROM_EMAIL)가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    text,
  });

  if (error) {
    return NextResponse.json({ error: "메일 발송에 실패했습니다." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
