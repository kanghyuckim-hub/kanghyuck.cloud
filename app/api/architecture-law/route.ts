import { NextResponse } from "next/server";

// 열린국회정보 - 국회의원 발의법률안 Open API
// https://open.assembly.go.kr/portal/openapi/nzmimeepazxkubdpn
const ASSEMBLY_ENDPOINT = "https://open.assembly.go.kr/portal/openapi/nzmimeepazxkubdpn";
const ASSEMBLY_AGE = "22"; // 제22대 국회

interface AssemblyBillItem {
  BILL_ID?: string;
  BILL_NO?: string;
  BILL_NAME?: string;
  COMMITTEE?: string;
  PROPOSE_DT?: string;
  PROC_RESULT?: string;
  PROPOSER?: string;
  RST_PROPOSER?: string;
}

export interface LawAmendmentItem {
  id: string;
  billId: string;
  billNo: string;
  title: string;
  proposer: string;
  committee: string;
  proposeDt: string;
  procResult: string;
  detailUrl: string;
}

function toDetailUrl(billId?: string) {
  if (!billId) return "https://likms.assembly.go.kr/bill/main.do";
  return `https://likms.assembly.go.kr/bill/billDetail.do?billId=${billId}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "건축법";
  const now = new Date();

  const apiKey = process.env.ASSEMBLY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      error:
        "ASSEMBLY_API_KEY가 설정되어 있지 않습니다. 열린국회정보(open.assembly.go.kr)에서 회원가입 후 발급받은 Open API 인증키를 .env.local에 설정해주세요.",
      bills: [],
      fetchedAt: now.toISOString(),
    });
  }

  const params = new URLSearchParams({
    KEY: apiKey,
    Type: "json",
    pIndex: "1",
    pSize: "50",
    AGE: ASSEMBLY_AGE,
    BILL_NAME: keyword,
  });

  const url = `${ASSEMBLY_ENDPOINT}?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();

    const service = data?.nzmimeepazxkubdpn;
    const head = service?.[0]?.head;
    const resultCode = head?.[1]?.RESULT?.CODE;

    // INFO-000: 정상 처리, INFO-200: 조회 데이터 없음 (둘 다 정상 응답으로 취급)
    if (resultCode && resultCode !== "INFO-000" && resultCode !== "INFO-200") {
      return NextResponse.json({
        error: head?.[1]?.RESULT?.MESSAGE || "개정안 정보를 불러오지 못했습니다.",
        bills: [],
        fetchedAt: now.toISOString(),
      });
    }

    const rows: AssemblyBillItem[] = service?.[1]?.row || [];

    const bills: LawAmendmentItem[] = rows.map((row, index) => ({
      id: `${row.BILL_ID || index}`,
      billId: row.BILL_ID || "",
      billNo: row.BILL_NO || "",
      title: row.BILL_NAME || "제목 없음",
      proposer: row.RST_PROPOSER || row.PROPOSER || "-",
      committee: row.COMMITTEE || "-",
      proposeDt: row.PROPOSE_DT || "",
      procResult: row.PROC_RESULT || "계류중",
      detailUrl: toDetailUrl(row.BILL_ID),
    }));

    bills.sort((a, b) => (a.proposeDt < b.proposeDt ? 1 : -1));

    return NextResponse.json({
      bills,
      fetchedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Assembly bill amendments:", error);
    return NextResponse.json({
      error: "개정안 정보를 불러오는 중 오류가 발생했습니다.",
      bills: [],
      fetchedAt: now.toISOString(),
    });
  }
}
