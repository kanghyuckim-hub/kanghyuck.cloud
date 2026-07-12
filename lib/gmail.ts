import { gmail_v1, google } from "googleapis";
import { getOAuth2Client } from "./google-auth";

let cachedGmail: gmail_v1.Gmail | null = null;

export function getGmailClient(): gmail_v1.Gmail {
  if (cachedGmail) return cachedGmail;
  cachedGmail = google.gmail({ version: "v1", auth: getOAuth2Client() });
  return cachedGmail;
}

/** users.watch()를 등록/갱신한다. 최대 7일마다 만료되므로 주기적으로 다시 호출해야 한다. */
export async function watchInbox(topicName: string) {
  const gmail = getGmailClient();
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName,
      labelIds: ["INBOX"],
      labelFilterAction: "include",
    },
  });
  return res.data; // { historyId, expiration }
}

/** historyId 이후 변경 내역을 조회해서 새로 도착한 메시지 ID 목록을 반환한다. */
export async function listNewMessageIds(startHistoryId: string): Promise<string[]> {
  const gmail = getGmailClient();
  const messageIds = new Set<string>();
  let pageToken: string | undefined;

  do {
    const res = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
      pageToken,
    });

    for (const history of res.data.history ?? []) {
      for (const added of history.messagesAdded ?? []) {
        if (added.message?.id) messageIds.add(added.message.id);
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return Array.from(messageIds);
}

/** 메시지 본문(스니펫 포함)을 조회한다. */
export async function getMessage(messageId: string) {
  const gmail = getGmailClient();
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });
  return res.data;
}

export interface ParsedMessage {
  id: string;
  threadId: string | null;
  from: string | null;
  fromName: string | null;
  to: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: Date | null;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function findBodyByMimeType(part: gmail_v1.Schema$MessagePart, mimeType: string): string | null {
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const found = findBodyByMimeType(child, mimeType);
    if (found) return found;
  }
  return null;
}

function parseFromHeader(fromHeader: string | null): { address: string | null; name: string | null } {
  if (!fromHeader) return { address: null, name: null };
  const match = fromHeader.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, "") || null, address: match[2].trim() };
  }
  return { address: fromHeader.trim(), name: null };
}

/** Gmail API 메시지를 저장/표시하기 쉬운 형태로 파싱한다. */
export function parseMessage(message: gmail_v1.Schema$Message): ParsedMessage {
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;

  const { address: from, name: fromName } = parseFromHeader(getHeader("From"));
  const dateHeader = getHeader("Date");

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? null,
    from,
    fromName,
    to: getHeader("To"),
    subject: getHeader("Subject"),
    snippet: message.snippet ?? null,
    bodyText: message.payload ? findBodyByMimeType(message.payload, "text/plain") : null,
    bodyHtml: message.payload ? findBodyByMimeType(message.payload, "text/html") : null,
    receivedAt: dateHeader ? new Date(dateHeader) : null,
  };
}
