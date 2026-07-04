import { Resend } from "resend";

function getResend(): { client: Resend; fromEmail: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !fromEmail) return null;
  return { client: new Resend(apiKey), fromEmail };
}

export async function notifyMastersOfAccessRequest(params: {
  masterEmails: string[];
  requesterName: string;
  requesterEmail: string;
  boardLabels: string[];
  message: string | null;
}) {
  const resend = getResend();
  if (!resend || params.masterEmails.length === 0) {
    console.warn("notifyMastersOfAccessRequest: 이메일 발송 설정이 없어 알림을 건너뜁니다.");
    return;
  }

  const { error } = await resend.client.emails.send({
    from: resend.fromEmail,
    to: params.masterEmails,
    subject: `[게시판 이용 신청] ${params.requesterName}님의 권한 요청`,
    text: `${params.requesterName}(${params.requesterEmail})님이 다음 게시판 이용 권한을 요청했습니다.

요청 게시판: ${params.boardLabels.join(", ") || "(선택 없음)"}
${params.message ? `요청 메시지: ${params.message}\n` : ""}
회원관리 > 게시판 이용 신청 관리 페이지에서 승인/거절할 수 있습니다.`,
  });

  if (error) {
    console.error("notifyMastersOfAccessRequest: 이메일 발송 실패:", error);
  }
}

export async function notifyMemberOfDecision(params: {
  memberEmail: string;
  memberName: string;
  approved: boolean;
  boardLabels: string[];
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("notifyMemberOfDecision: 이메일 발송 설정이 없어 알림을 건너뜁니다.");
    return;
  }

  const subject = params.approved
    ? "[알림] 게시판 이용 권한이 승인되었습니다"
    : "[알림] 게시판 이용 권한 요청이 거절되었습니다";

  const text = params.approved
    ? `${params.memberName}님, 요청하신 게시판 이용 권한이 승인되었습니다.

승인된 게시판: ${params.boardLabels.join(", ") || "없음"}`
    : `${params.memberName}님, 요청하신 게시판 이용 권한 요청이 거절되었습니다.

필요하시면 다시 요청해주세요.`;

  const { error } = await resend.client.emails.send({
    from: resend.fromEmail,
    to: params.memberEmail,
    subject,
    text,
  });

  if (error) {
    console.error("notifyMemberOfDecision: 이메일 발송 실패:", error);
  }
}
