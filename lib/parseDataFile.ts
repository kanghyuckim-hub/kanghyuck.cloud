import { extractText } from "unpdf";
import * as XLSX from "xlsx";

const EXCEL_CONTENT_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];

function parseExcelBuffer(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `--- 시트: ${name} ---\n${csv}`;
  }).join("\n\n");
}

export async function parseDataBuffer(buffer: ArrayBuffer, contentType: string): Promise<string> {
  if (contentType === "application/pdf") {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text);
  }

  if (EXCEL_CONTENT_TYPES.includes(contentType)) {
    return parseExcelBuffer(buffer);
  }

  // CSV or TXT
  const decoded = new TextDecoder("utf-8").decode(buffer);
  return decoded;
}

export async function fetchAndParseDataFile(url: string, contentType: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("업로드된 파일을 불러오지 못했습니다.");
  const buffer = await res.arrayBuffer();
  return parseDataBuffer(buffer, contentType);
}
