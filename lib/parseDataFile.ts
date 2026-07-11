import { extractText } from "unpdf";

export async function parseDataBuffer(buffer: ArrayBuffer, contentType: string): Promise<string> {
  if (contentType === "application/pdf") {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text);
  }

  // CSV, TXT, or plain text Excel fallback
  const decoded = new TextDecoder("utf-8").decode(buffer);
  return decoded;
}

export async function fetchAndParseDataFile(url: string, contentType: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("업로드된 파일을 불러오지 못했습니다.");
  const buffer = await res.arrayBuffer();
  return parseDataBuffer(buffer, contentType);
}
