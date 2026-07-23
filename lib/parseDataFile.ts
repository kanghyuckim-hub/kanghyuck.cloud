import { extractText } from "unpdf";
import * as XLSX from "xlsx";

function isPdf(bytes: Uint8Array): boolean {
  // "%PDF"
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function isZipContainer(bytes: Uint8Array): boolean {
  // "PK" — .xlsx (and other Office Open XML formats) are zip archives
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function isOle2Container(bytes: Uint8Array): boolean {
  // D0 CF 11 E0 A1 B1 1A E1 — legacy binary Office format (.xls, .doc, ...)
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return sig.every((byte, i) => bytes[i] === byte);
}

function parseExcelBuffer(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `--- 시트: ${name} ---\n${csv}`;
  }).join("\n\n");
}

export async function parseDataBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);

  if (isPdf(bytes)) {
    const { text } = await extractText(bytes, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text);
  }

  if (isZipContainer(bytes) || isOle2Container(bytes)) {
    return parseExcelBuffer(buffer);
  }

  // CSV or TXT
  return new TextDecoder("utf-8").decode(buffer);
}

export async function fetchAndParseDataFile(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("업로드된 파일을 불러오지 못했습니다.");
  const buffer = await res.arrayBuffer();
  return parseDataBuffer(buffer);
}
