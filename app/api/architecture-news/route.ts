import { NextResponse } from "next/server";

// 조달청 나라장터 입찰공고정보서비스 (공공데이터포털)
// https://www.data.go.kr/data/15129394/openapi.do
const G2B_ENDPOINT =
  "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServcPPSSrch";

export const BID_CATEGORIES = [
  { id: "architecture", label: "건축설계", keyword: "건축설계" },
  { id: "interior", label: "실내건축", keyword: "실내건축" },
  { id: "landscape", label: "조경설계", keyword: "조경설계" },
  { id: "urban", label: "도시계획", keyword: "도시계획" },
  { id: "supervision", label: "감리", keyword: "감리" },
] as const;

export type BidCategoryId = (typeof BID_CATEGORIES)[number]["id"];

interface G2BBidItem {
  bidNtceNo?: string;
  bidNtceOrd?: string;
  bidNtceNm?: string;
  ntceInsttNm?: string;
  dminsttNm?: string;
  bidNtceDt?: string;
  bidClseDt?: string;
  opengDt?: string;
  presmptPrce?: string;
  bidNtceDtlUrl?: string;
}

export interface ArchitectureBidItem {
  id: string;
  bidNtceNo: string;
  title: string;
  ntceInsttNm: string;
  dminsttNm: string;
  bidNtceDt: string;
  bidClseDt: string;
  opengDt: string;
  presmptPrce: string;
  detailUrl: string;
  categoryId: BidCategoryId;
  categoryLabel: string;
}

function formatDt(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours()
  )}${pad(date.getMinutes())}`;
}

function toDetailUrl(bidNtceNo?: string, bidNtceOrd?: string) {
  if (!bidNtceNo) return "https://www.g2b.go.kr";
  return `https://www.g2b.go.kr:8081/ep/invitation/publish/bidInfoDtl.do?bidno=${bidNtceNo}&bidseq=${
    bidNtceOrd || "00"
  }`;
}

async function fetchBidsForKeyword(
  keyword: string,
  serviceKey: string
): Promise<{ items: G2BBidItem[]; error?: string }> {
  const now = new Date();
  const begin = new Date(now);
  begin.setDate(begin.getDate() - 30);

  const params = new URLSearchParams({
    inqryDiv: "1",
    inqryBgnDt: formatDt(begin),
    inqryEndDt: formatDt(now),
    type: "json",
    numOfRows: "30",
    pageNo: "1",
    bidNtceNm: keyword,
  });

  // 공공데이터포털 인증키(Encoding)는 이미 URL 인코딩된 값이므로 그대로 붙입니다.
  const url = `${G2B_ENDPOINT}?${params.toString()}&ServiceKey=${serviceKey}`;

  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    const text = await res.text();

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      // 나라장터 서버가 일시적으로 JSON이 아닌 응답(오류 페이지 등)을 반환하는 경우
      console.error(`G2B non-JSON response for keyword "${keyword}":`, text.slice(0, 200));
      return { items: [], error: "입찰공고 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." };
    }

    const header = (data as { response?: { header?: { resultCode?: string; resultMsg?: string } } })
      ?.response?.header;
    if (!header || header.resultCode !== "00") {
      return { items: [], error: header?.resultMsg || "입찰공고 정보를 불러오지 못했습니다." };
    }

    const rawItems = (data as { response?: { body?: { items?: unknown } } })?.response?.body?.items;
    return { items: Array.isArray(rawItems) ? (rawItems as G2BBidItem[]) : [] };
  } catch (error) {
    console.error(`Error fetching G2B bids for keyword "${keyword}":`, error);
    return { items: [], error: "입찰공고 정보를 불러오는 중 오류가 발생했습니다." };
  }
}

function toArchitectureBidItem(
  item: G2BBidItem,
  categoryId: BidCategoryId,
  categoryLabel: string
): ArchitectureBidItem {
  return {
    id: `${item.bidNtceNo || Math.random()}-${item.bidNtceOrd || "0"}`,
    bidNtceNo: item.bidNtceNo || "",
    title: item.bidNtceNm || "제목 없음",
    ntceInsttNm: item.ntceInsttNm || "-",
    dminsttNm: item.dminsttNm || item.ntceInsttNm || "-",
    bidNtceDt: item.bidNtceDt || "",
    bidClseDt: item.bidClseDt || "",
    opengDt: item.opengDt || "",
    presmptPrce: item.presmptPrce || "",
    detailUrl: item.bidNtceDtlUrl || toDetailUrl(item.bidNtceNo, item.bidNtceOrd),
    categoryId,
    categoryLabel,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category") || "all";
  const now = new Date();

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    return NextResponse.json({
      error:
        "DATA_GO_KR_SERVICE_KEY가 설정되어 있지 않습니다. 공공데이터포털(data.go.kr)에서 '조달청_나라장터 입찰공고정보서비스' 활용신청 후 발급받은 인증키를 .env.local에 설정해주세요.",
      bids: [],
      fetchedAt: now.toISOString(),
    });
  }

  const categories =
    categoryParam === "all"
      ? BID_CATEGORIES
      : BID_CATEGORIES.filter((c) => c.id === categoryParam);

  if (categories.length === 0) {
    return NextResponse.json({
      error: "존재하지 않는 업종 카테고리입니다.",
      bids: [],
      fetchedAt: now.toISOString(),
    });
  }

  try {
    const results = await Promise.all(
      categories.map(async (category) => {
        const { items, error } = await fetchBidsForKeyword(category.keyword, serviceKey);
        return { category, items, error };
      })
    );

    const firstError = results.find((r) => r.error)?.error;

    const seen = new Set<string>();
    const bids: ArchitectureBidItem[] = [];
    for (const { category, items } of results) {
      for (const item of items) {
        const key = `${item.bidNtceNo}-${item.bidNtceOrd}`;
        if (seen.has(key)) continue;
        seen.add(key);
        bids.push(toArchitectureBidItem(item, category.id, category.label));
      }
    }

    bids.sort((a, b) => (a.bidNtceDt < b.bidNtceDt ? 1 : -1));

    return NextResponse.json({
      bids,
      error: bids.length === 0 ? firstError : undefined,
      fetchedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching G2B bid announcements:", error);
    return NextResponse.json({
      error: "입찰공고 정보를 불러오는 중 오류가 발생했습니다.",
      bids: [],
      fetchedAt: now.toISOString(),
    });
  }
}
