"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search, X } from "lucide-react";
import { BID_CATEGORIES, type ArchitectureBidItem } from "@/app/api/architecture-news/route";
import type { LawAmendmentItem } from "@/app/api/architecture-law/route";
import type { NaverNewsItem } from "@/app/api/naver-news/route";

interface BidResponse {
  bids: ArchitectureBidItem[];
  error?: string;
  fetchedAt: string;
}

interface LawResponse {
  bills: LawAmendmentItem[];
  error?: string;
  fetchedAt: string;
}

interface RelatedNewsResponse {
  news: NaverNewsItem[];
  count: number;
}

const RELATED_NEWS_KEYWORD = "건축법 시행령";

const TABS = [
  { id: "all", label: "종합" },
  ...BID_CATEGORIES,
  { id: "law", label: "건축법 개정안" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDateTime(dateString: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPrice(price: string) {
  const value = Number(price);
  if (!price || Number.isNaN(value)) return "비공개";
  return `${value.toLocaleString("ko-KR")}원`;
}

export default function ArchitecturePage() {
  const [tab, setTab] = useState<TabId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const isLawTab = tab === "law";
  const apiUrl = isLawTab
    ? "/api/architecture-law?keyword=건축법"
    : `/api/architecture-news?category=${tab}`;

  const { data, isLoading } = useSWR<BidResponse | LawResponse>(apiUrl, fetcher, {
    refreshInterval: 600000, // 10분마다 갱신
  });

  // 시행령/시행규칙/조례 등은 공식 목록 API가 없어, 네이버 뉴스 검색으로 관련 소식을 대신 보여줍니다.
  const { data: relatedNews, isLoading: relatedNewsLoading } = useSWR<RelatedNewsResponse>(
    isLawTab ? `/api/naver-news?keyword=${encodeURIComponent(RELATED_NEWS_KEYWORD)}` : null,
    fetcher,
    { refreshInterval: 600000 }
  );

  const handleTabClick = (tabId: TabId) => {
    setTab(tabId);
    setSearchQuery("");
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const minPriceWon = minPrice ? Number(minPrice) * 10000 : null;
  const maxPriceWon = maxPrice ? Number(maxPrice) * 10000 : null;

  const filteredBids = !isLawTab
    ? (data as BidResponse | undefined)?.bids.filter((bid) => {
        if (normalizedQuery) {
          const matchesQuery =
            bid.title.toLowerCase().includes(normalizedQuery) ||
            bid.ntceInsttNm.toLowerCase().includes(normalizedQuery) ||
            bid.dminsttNm.toLowerCase().includes(normalizedQuery);
          if (!matchesQuery) return false;
        }
        if (minPriceWon !== null || maxPriceWon !== null) {
          const price = Number(bid.presmptPrce);
          if (!bid.presmptPrce || Number.isNaN(price)) return false;
          if (minPriceWon !== null && price < minPriceWon) return false;
          if (maxPriceWon !== null && price > maxPriceWon) return false;
        }
        return true;
      })
    : undefined;

  const filteredBills = isLawTab
    ? (data as LawResponse | undefined)?.bills.filter((bill) => {
        if (!normalizedQuery) return true;
        return (
          bill.title.toLowerCase().includes(normalizedQuery) ||
          bill.proposer.toLowerCase().includes(normalizedQuery) ||
          bill.committee.toLowerCase().includes(normalizedQuery)
        );
      })
    : undefined;

  return (
    <div className="min-h-[calc(100vh-48px)] bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isLawTab ? "건축법 관련 개정안" : "건축설계 입찰공고 정보"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isLawTab
              ? "열린국회정보(국회사무처) 공공데이터를 기반으로 제공되는 건축법 관련 발의 법률안입니다"
              : "나라장터(조달청) 공공데이터를 기반으로 제공되는 건축설계 관련 입찰공고입니다"}
          </p>
          {data && (
            <p className="mt-1 text-sm text-gray-500">
              마지막 조회: {formatDateTime(data.fetchedAt)} · 10분마다 자동 갱신
            </p>
          )}
        </div>

        {/* 종합/업종별/개정안 탭 */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabClick(t.id)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 키워드 검색 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder={
              isLawTab
                ? "법률안명, 제안자, 소관위원회로 검색..."
                : "공고명, 발주기관, 수요기관으로 검색..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 추정가격 범위 검색 */}
        {!isLawTab && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600">추정가격</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="최소 (만원)"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-32"
            />
            <span className="text-sm text-gray-400">~</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="최대 (만원)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-32"
            />
            {(minPrice || maxPrice) && (
              <button
                type="button"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                }}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
                초기화
              </button>
            )}
          </div>
        )}

        {/* Config error notice */}
        {data?.error && (
          <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            {data.error}
          </div>
        )}

        {/* List */}
        <div className="flex flex-col gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-gray-200">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : isLawTab ? (
            filteredBills?.length ? (
              filteredBills.map((bill) => (
                <a
                  key={bill.id}
                  href={bill.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="border-gray-200 transition-shadow hover:shadow-md cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {bill.committee}
                        </Badge>
                        <Badge variant="outline" className="border-gray-300 text-gray-600">
                          {bill.procResult}
                        </Badge>
                      </div>
                      <CardTitle className="flex items-start justify-between gap-2 text-lg text-gray-900">
                        <span>{bill.title}</span>
                        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-1 text-sm text-gray-600 sm:grid-cols-2">
                        <p>대표발의: {bill.proposer}</p>
                        <p>제안일: {formatDate(bill.proposeDt)}</p>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">의안번호: {bill.billNo}</p>
                    </CardContent>
                  </Card>
                </a>
              ))
            ) : (
              <p className="py-12 text-center text-gray-500">
                {normalizedQuery
                  ? "검색 결과와 일치하는 개정안이 없습니다."
                  : "현재 조건에 맞는 개정안이 없습니다."}
              </p>
            )
          ) : filteredBids?.length ? (
            filteredBids.map((bid) => (
              <a
                key={bid.id}
                href={bid.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="border-gray-200 transition-shadow hover:shadow-md cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      {tab === "all" && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          {bid.categoryLabel}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {bid.ntceInsttNm}
                      </Badge>
                      {bid.dminsttNm !== bid.ntceInsttNm && (
                        <Badge variant="outline" className="border-gray-300 text-gray-600">
                          수요기관: {bid.dminsttNm}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="flex items-start justify-between gap-2 text-lg text-gray-900">
                      <span>{bid.title}</span>
                      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-1 text-sm text-gray-600 sm:grid-cols-3">
                      <p>입찰마감: {formatDateTime(bid.bidClseDt)}</p>
                      <p>개찰일시: {formatDateTime(bid.opengDt)}</p>
                      <p>추정가격: {formatPrice(bid.presmptPrce)}</p>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">공고번호: {bid.bidNtceNo}</p>
                  </CardContent>
                </Card>
              </a>
            ))
          ) : (
            <p className="py-12 text-center text-gray-500">
              {normalizedQuery
                ? "검색 결과와 일치하는 입찰공고가 없습니다."
                : "현재 조건에 맞는 입찰공고가 없습니다."}
            </p>
          )}
        </div>

        {/* 관련 시행령/시행규칙/조례 뉴스 (공식 목록 API가 없어 뉴스 검색으로 대체) */}
        {isLawTab && (
          <div className="mt-10">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">
              관련 시행령·조례 소식
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              &ldquo;{RELATED_NEWS_KEYWORD}&rdquo; 관련 뉴스 검색 결과입니다 (네이버 뉴스 기반, 공식 입법예고
              데이터가 아닙니다).
            </p>
            <div className="flex flex-col gap-3">
              {relatedNewsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-gray-200">
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="mt-2 h-4 w-1/3" />
                    </CardContent>
                  </Card>
                ))
              ) : relatedNews?.news.length ? (
                relatedNews.news.slice(0, 10).map((item) => (
                  <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer">
                    <Card className="border-gray-200 transition-shadow hover:shadow-md">
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">{item.source}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                      </CardContent>
                    </Card>
                  </a>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-gray-400">
                  관련 뉴스를 찾을 수 없습니다.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
