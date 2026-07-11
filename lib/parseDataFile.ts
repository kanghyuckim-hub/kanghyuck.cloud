import { extractText } from "unpdf";

export async function parseDataFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  if (file.type === "application/pdf") {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text);
  }

  // CSV, TXT, or plain text Excel fallback
  const decoded = new TextDecoder("utf-8").decode(buffer);
  return decoded;
}
