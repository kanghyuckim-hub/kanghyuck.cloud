import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface NaverNewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string | null;
  source: string;
  date: string;
}

const fetchHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

async function fetchNaverHtml(url: string, revalidate = 300) {
  const response = await fetch(url, {
    headers: fetchHeaders,
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  return await response.text();
}

// 네이버 뉴스 헤드라인 스크래핑
async function fetchNaverNews(): Promise<NaverNewsItem[]> {
  try {
    const html = await fetchNaverHtml("https://news.naver.com/", 300);
    const $ = cheerio.load(html);

    const newsItems: NaverNewsItem[] = [];

    // 네이버 뉴스 메인 헤드라인 영역 파싱
    $(".cjs_journal_wrap .cjs_t").each((index, element) => {
      if (index >= 20) return false; // 최대 20개

      const $el = $(element);
      const $parent = $el.closest("a");
      
      const title = $el.text().trim();
      const link = $parent.attr("href") || "";
      
      if (title && link) {
        newsItems.push({
          id: `news-${index}-${Date.now()}`,
          title,
          description: "",
          link: link.startsWith("http") ? link : `https://news.naver.com${link}`,
          imageUrl: null,
          source: "네이버뉴스",
          date: new Date().toISOString(),
        });
      }
    });

    // 헤드라인이 부족하면 다른 섹션도 파싱
    if (newsItems.length < 10) {
      $("a.cjs_headline_default_item, .sa_text a").each((index, element) => {
        if (newsItems.length >= 20) return false;

        const $el = $(element);
        const title = $el.find(".cjs_d, .sa_text_title").text().trim() || $el.text().trim();
        const link = $el.attr("href") || "";
        const $img = $el.find("img");
        const imageUrl = $img.attr("src") || $img.attr("data-src") || null;

        if (title && link && !newsItems.some((item) => item.title === title)) {
          newsItems.push({
            id: `news-${newsItems.length}-${Date.now()}`,
            title,
            description: "",
            link: link.startsWith("http") ? link : `https://news.naver.com${link}`,
            imageUrl,
            source: "네이버뉴스",
            date: new Date().toISOString(),
          });
        }
      });
    }

    // 최종 대체 파서: 페이지 내 뉴스 관련 링크 직접 수집
    if (newsItems.length === 0) {
      console.log("[naver-news] primary selectors failed, trying fallback link scan");
      $("a[href*='news.naver.com/article'], a[href*='n.news.naver.com'], a[href*='/main/read.naver']")
        .each((index, element) => {
          if (newsItems.length >= 20) return false;

          const $el = $(element);
          const title = $el.attr('title') || $el.text().trim();
          const link = $el.attr('href') || '';

          if (title && link && title.length > 5 && !newsItems.some((item) => item.title === title)) {
            newsItems.push({
              id: `news-fallback-${newsItems.length}-${Date.now()}`,
              title: title.replace(/\s+/g, ' ').trim(),
              description: '',
              link: link.startsWith('http') ? link : `https://news.naver.com${link}`,
              imageUrl: null,
              source: '네이버뉴스',
              date: new Date().toISOString(),
            });
          }
        });
    }

    // 연예/스포츠 등 다른 섹션
    if (newsItems.length < 10) {
      $(".cjs_news_mw a, .cjs_d, .sa_item a").each((index, element) => {
        if (newsItems.length >= 20) return false;

        const $el = $(element);
        let title = $el.attr("title") || $el.text().trim();
        const link = $el.attr("href") || "";
        
        // 제목 정리
        title = title.replace(/\s+/g, " ").trim();

        if (title && link && title.length > 5 && !newsItems.some((item) => item.title === title)) {
          newsItems.push({
            id: `news-${newsItems.length}-${Date.now()}`,
            title,
            description: "",
            link: link.startsWith("http") ? link : `https://news.naver.com${link}`,
            imageUrl: null,
            source: "네이버뉴스",
            date: new Date().toISOString(),
          });
        }
      });
    }

    return newsItems;
  } catch (error) {
    console.error("Error fetching Naver news:", error);
    return [];
  }
}

// 네이버 뉴스 섹션별 API 스크래핑
async function fetchNaverNewsBySection(section: string): Promise<NaverNewsItem[]> {
  const sectionUrls: Record<string, string> = {
    politics: "https://news.naver.com/section/100",
    economy: "https://news.naver.com/section/101",
    society: "https://news.naver.com/section/102",
    life: "https://news.naver.com/section/103",
    world: "https://news.naver.com/section/104",
    it: "https://news.naver.com/section/105",
  };

  const url = sectionUrls[section] || "https://news.naver.com/";

  try {
    const html = await fetchNaverHtml(url, 300);
    const $ = cheerio.load(html);

    const newsItems: NaverNewsItem[] = [];

    // 섹션 페이지 뉴스 아이템 파싱
    $(".sa_item, .sa_text, .cjs_t").each((index, element) => {
      if (index >= 20) return false;

      const $el = $(element);
      const $link = $el.is("a") ? $el : $el.find("a").first();
      const title = $el.find(".sa_text_title, .cjs_t").text().trim() || $link.text().trim();
      const link = $link.attr("href") || "";
      const description = $el.find(".sa_text_lede").text().trim();
      const $img = $el.find("img");
      const imageUrl = $img.attr("src") || $img.attr("data-src") || null;
      const source = $el.find(".sa_text_press").text().trim() || "네이버뉴스";

      if (title && link && !newsItems.some((item) => item.title === title)) {
        newsItems.push({
          id: `news-${index}-${Date.now()}`,
          title: title.replace(/\s+/g, " ").trim(),
          description: description.replace(/\s+/g, " ").trim(),
          link: link.startsWith("http") ? link : `https://news.naver.com${link}`,
          imageUrl,
          source,
          date: new Date().toISOString(),
        });
      }
    });

    return newsItems;
  } catch (error) {
    console.error(`Error fetching Naver news section ${section}:`, error);
    return [];
  }
}

// 네이버 뉴스 검색 스크래핑
async function searchNaverNews(keyword: string): Promise<NaverNewsItem[]> {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://search.naver.com/search.naver?where=news&query=${encodedKeyword}&sm=tab_opt&sort=1`;

    const response = await fetch(url, {
      headers: {
        ...fetchHeaders,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      next: { revalidate: 60 }, // 1분 캐시
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const newsItems: NaverNewsItem[] = [];

    // 네이버 검색 결과 뉴스 파싱 (신규 SDS 컴포넌트 마크업 기준)
    // 각 기사는 data-heatmap-target 속성으로 제목(.tit)/본문(.body)/이미지(.img) 링크를 구분해 노출합니다.
    $('a[data-heatmap-target=".tit"]').each((index, element) => {
      if (index >= 30) return false;

      const $titleLink = $(element);
      const title = $titleLink.text().replace(/\s+/g, " ").trim();
      const link = $titleLink.attr("href") || "";

      // 제목 컬럼 -> 콘텐츠 래퍼 -> 아이템 컨테이너 순으로 상위 탐색
      const $content = $titleLink.parent().parent();
      const $item = $content.parent();

      const description = $content
        .find('a[data-heatmap-target=".body"]')
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const $img = $content.find('a[data-heatmap-target=".img"] img');
      const imageUrl = $img.attr("src") || null;

      const $profile = $item.find('[data-sds-comp="Profile"]').first();
      const source =
        $profile.find(".sds-comps-profile-info-title-text").first().text().trim() ||
        "뉴스";
      const dateText = $profile
        .find(".sds-comps-profile-info-subtext")
        .first()
        .text()
        .trim();

      if (title && link && title.length > 2) {
        newsItems.push({
          id: `search-${index}-${Date.now()}`,
          title,
          description,
          link,
          imageUrl,
          source,
          date: dateText || new Date().toISOString(),
        });
      }
    });

    // 마크업이 또 바뀌어 위 파싱이 실패할 경우를 대비한 최후 대체 방법 - 모든 뉴스 관련 링크
    if (newsItems.length === 0) {
      $("a[href*='news.naver.com/article'], a[href*='n.news.naver.com']").each((index, element) => {
        if (index >= 30) return false;

        const $el = $(element);
        const title = $el.attr("title") || $el.text().trim();
        const link = $el.attr("href") || "";

        if (title && link && title.length > 5 && !newsItems.some(item => item.title === title)) {
          newsItems.push({
            id: `search-${index}-${Date.now()}`,
            title: title.replace(/\s+/g, " ").trim(),
            description: "",
            link,
            imageUrl: null,
            source: "뉴스",
            date: new Date().toISOString(),
          });
        }
      });
    }

    return newsItems;
  } catch (error) {
    console.error(`Error searching Naver news for "${keyword}":`, error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") || "main";
  const keyword = searchParams.get("keyword") || "";

  let news: NaverNewsItem[];

  if (keyword) {
    // 키워드 검색
    news = await searchNaverNews(keyword);
  } else if (section === "main") {
    // 메인: 여러 섹션을 순차적으로 가져와 합칩니다.
    const sectionsToFetch = ["politics", "economy", "society", "life", "world", "it"];
    const aggregated: NaverNewsItem[] = [];
    for (const s of sectionsToFetch) {
      const items = await fetchNaverNewsBySection(s);
      for (const it of items) {
        if (!aggregated.some((a) => a.title === it.title)) {
          aggregated.push(it);
        }
        if (aggregated.length >= 20) break;
      }
      if (aggregated.length >= 20) break;
    }
    news = aggregated;
  } else {
    news = await fetchNaverNewsBySection(section);
  }

  return NextResponse.json({
    success: true,
    count: news.length,
    section: keyword ? "search" : section,
    keyword: keyword || null,
    news,
    fetchedAt: new Date().toISOString(),
  });
}
