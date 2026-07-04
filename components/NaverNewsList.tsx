"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  Globe,
  Building2,
  Users,
  Heart,
  Cpu,
  ChevronRight,
  Search,
  X,
  Home,
} from "lucide-react";

import { Input } from "@/components/ui/input";

interface NaverNewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string | null;
  source: string;
  date: string;
}

interface NewsResponse {
  success: boolean;
  count: number;
  section: string;
  keyword: string | null;
  news: NaverNewsItem[];
  fetchedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const sections = [
  { id: "main", label: "헤드라인", icon: Newspaper },
  { id: "politics", label: "정치", icon: Building2 },
  { id: "economy", label: "경제", icon: Building2 },
  { id: "society", label: "사회", icon: Users },
  { id: "life", label: "생활/문화", icon: Heart },
  { id: "world", label: "세계", icon: Globe },
  { id: "it", label: "IT/과학", icon: Cpu },
];

const mainTabs = [
  { id: "naver", label: "네이버 뉴스", icon: Newspaper },
  { id: "realestate", label: "부동산 전문 뉴스", icon: Home },
] as const;

const REALESTATE_KEYWORD = "부동산";

export default function NaverNewsList() {
  const [mainTab, setMainTab] = useState<(typeof mainTabs)[number]["id"]>("naver");
  const [selectedSection, setSelectedSection] = useState("main");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");

  const isRealEstate = mainTab === "realestate";

  const apiUrl = isRealEstate
    ? `/api/naver-news?keyword=${encodeURIComponent(REALESTATE_KEYWORD)}`
    : activeKeyword
    ? `/api/naver-news?keyword=${encodeURIComponent(activeKeyword)}`
    : `/api/naver-news?section=${selectedSection}`;

  const handleMainTabClick = (tabId: (typeof mainTabs)[number]["id"]) => {
    setMainTab(tabId);
    setActiveKeyword("");
    setSearchKeyword("");
    setSelectedSection("main");
  };

  const { data, error, isLoading, mutate } = useSWR<NewsResponse>(
    apiUrl,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5분마다 자동 갱신
      revalidateOnFocus: false,
    }
  );

  const handleRefresh = () => {
    mutate();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      setActiveKeyword(searchKeyword.trim());
      setSelectedSection(""); // 섹션 선택 해제
    }
  };

  const handleClearSearch = () => {
    setSearchKeyword("");
    setActiveKeyword("");
    setSelectedSection("main");
  };

  const handleSectionClick = (sectionId: string) => {
    setSelectedSection(sectionId);
    setActiveKeyword(""); // 검색 해제
    setSearchKeyword("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isRealEstate ? "bg-amber-500" : "bg-green-500"
              }`}
            >
              {isRealEstate ? (
                <Home className="h-5 w-5 text-white" />
              ) : (
                <Newspaper className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isRealEstate ? "부동산 전문 뉴스" : "네이버 뉴스"}
              </h1>
              <p className="text-sm text-gray-500">
                {isRealEstate ? "실시간 부동산 관련 뉴스" : "실시간 뉴스 헤드라인"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            새로고침
          </Button>
        </div>

        {/* 메인 탭 */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleMainTabClick(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 검색 바 */}
        {!isRealEstate && (
        <>
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="키워드로 뉴스 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-10 pr-20"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword("")}
                className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              disabled={!searchKeyword.trim()}
            >
              검색
            </Button>
          </div>
        </form>

        {/* 활성 검색어 표시 */}
        {activeKeyword && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <Search className="mr-1 h-3 w-3" />
              {activeKeyword}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="h-6 px-2 text-xs text-gray-500"
            >
              검색 초기화
            </Button>
          </div>
        )}

        {/* 섹션 탭 */}
        <div className="mb-6 flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Button
                key={section.id}
                variant={selectedSection === section.id && !activeKeyword ? "default" : "outline"}
                size="sm"
                onClick={() => handleSectionClick(section.id)}
                className="rounded-full"
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {section.label}
              </Button>
            );
          })}
        </div>
        </>
        )}

        {/* 에러 상태 */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-red-700">
                뉴스를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
              </p>
            </CardContent>
          </Card>
        )}

        {/* 로딩 스켈레톤 */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                    <Skeleton className="h-20 w-28 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 뉴스 목록 */}
        {!isLoading && data?.news && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                총 <span className="font-semibold">{data.count}</span>개의 뉴스
              </p>
              {data.fetchedAt && (
                <p className="text-xs text-gray-400">
                  업데이트:{" "}
                  {new Date(data.fetchedAt).toLocaleTimeString("ko-KR")}
                </p>
              )}
            </div>

            {data.news.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Newspaper className="mb-4 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">뉴스를 찾을 수 없습니다.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={handleRefresh}
                  >
                    다시 시도
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {data.news.map((item, index) => (
                  <Card
                    key={item.id}
                    className="group overflow-hidden transition-all hover:shadow-md"
                  >
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* 번호 뱃지 */}
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                            {index + 1}
                          </div>

                          {/* 내용 */}
                          <div className="flex-1 min-w-0">
                            <h3 className="mb-1 line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="mb-2 line-clamp-1 text-sm text-gray-500">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="bg-gray-100 text-gray-600 text-xs"
                              >
                                {item.source}
                              </Badge>
                            </div>
                          </div>

                          {/* 이미지 또는 화살표 */}
                          {item.imageUrl ? (
                            <div className="flex-shrink-0">
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-20 w-28 rounded-lg object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-50 group-hover:bg-green-50 transition-colors">
                              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </a>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* 푸터 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            {isRealEstate
              ? "부동산 관련 뉴스는 네이버 뉴스 검색 결과를 기반으로 제공됩니다."
              : "본 뉴스는 네이버 뉴스에서 제공됩니다."}
          </p>
          <a
            href={
              isRealEstate
                ? `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(
                    REALESTATE_KEYWORD
                  )}`
                : "https://news.naver.com"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline mt-1"
          >
            네이버 뉴스 바로가기
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
