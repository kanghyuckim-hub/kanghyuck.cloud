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
