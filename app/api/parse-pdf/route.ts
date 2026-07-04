import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

interface YearlyFinancialData {
  year: string;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  currentAssets: number;
  currentLiabilities: number;
  inventory: number;
  receivables: number;
  cash: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
}

// 텍스트 정규화 - 모든 공백을 단일 공백으로
function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ");
}

// 숫자 파싱 - 괄호와 삼각형은 음수
function parseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/\s/g, "");
  
  // 괄호 또는 삼각형(△)으로 둘러싸인 숫자는 음수
  const isNegative = cleaned.includes("(") || cleaned.includes("△") || cleaned.startsWith("-");
  
  // 숫자만 추출
  const numStr = cleaned.replace(/[^\d.]/g, "");
  const num = parseFloat(numStr) || 0;
  
  return isNegative ? -num : num;
}

// 키워드를 유연한 패턴으로 변환 (각 글자 사이에 공백 허용)
function makeFlexiblePattern(keyword: string): RegExp {
  // 한글/영문 글자 사이에 \s* 추가
  const chars = keyword.split("");
  const pattern = chars.join("\\s*");
  return new RegExp(pattern, "gi");
}

// 키워드 이후 숫자 2개 추출 (당기, 전기)
function extractTwoNumbers(text: string, keywords: string[]): [number, number] {
  const normalizedText = normalizeText(text);
  // 공백 완전 제거 버전도 생성
  const noSpaceText = text.replace(/\s+/g, "");
  
  for (const keyword of keywords) {
    // 1. 먼저 정규화된 텍스트에서 유연한 패턴으로 검색
    const flexPattern = makeFlexiblePattern(keyword);
    let match = flexPattern.exec(normalizedText);
    let searchText = normalizedText;
    
    // 2. 못 찾으면 공백 완전 제거 텍스트에서 검색
    if (!match) {
      const noSpaceKeyword = keyword.replace(/\s+/g, "");
      const noSpacePattern = new RegExp(noSpaceKeyword, "gi");
      match = noSpacePattern.exec(noSpaceText);
      searchText = noSpaceText;
    }
    
    if (match) {
      // 키워드 이후 500자 범위에서 숫자 찾기
      const afterKeyword = searchText.substring(match.index + match[0].length, match.index + match[0].length + 500);
      
      // 숫자 패턴: (123,456) 또는 △123,456 또는 -123,456 또는 123,456
      const numbers: number[] = [];
      const numPattern = /(?:\([\d,]+(?:\.\d+)?\)|△[\d,]+(?:\.\d+)?|-[\d,]+(?:\.\d+)?|(?<![.\d])[\d,]{4,}(?:\.\d+)?)/g;
      
      let numMatch;
      while ((numMatch = numPattern.exec(afterKeyword)) !== null) {
        const num = parseNumber(numMatch[0]);
        const absNum = Math.abs(num);
        // 연도 제외 (2020-2030)
        // 페이지 번호, 작은 숫자 제외 (원 단위 재무제표는 보통 백만원 이상 = 1,000,000 이상)
        // 최소 100,000 이상인 숫자만 유효한 재무 데이터로 간주
        if (absNum >= 100000 && !(absNum >= 2020 && absNum <= 2030)) {
          numbers.push(num);
          if (numbers.length >= 2) break;
        }
      }
      
      if (numbers.length >= 2) {
        console.log(`[v0] Found "${keyword}": ${numbers[0]}, ${numbers[1]}`);
        return [numbers[0], numbers[1]];
      } else if (numbers.length === 1) {
        console.log(`[v0] Found "${keyword}": ${numbers[0]}, 0`);
        return [numbers[0], 0];
      }
    }
  }
  return [0, 0];
}

// 섹션 추출 - 더 넓은 범위로 추출
function extractSection(text: string, startKeywords: string[], endKeywords: string[]): string {
  const normalizedText = normalizeText(text);
  
  let startIndex = 0;
  for (const keyword of startKeywords) {
    // 공백 없이 직접 검색
    const simplePattern = new RegExp(keyword.replace(/\s+/g, "\\s*"), "gi");
    const match = simplePattern.exec(normalizedText);
    if (match) {
      startIndex = match.index;
      break;
    }
  }
  
  // 시작 키워드를 못 찾으면 전체 텍스트 반환
  if (startIndex === 0) {
    return normalizedText;
  }
  
  let endIndex = normalizedText.length;
  for (const keyword of endKeywords) {
    const simplePattern = new RegExp(keyword.replace(/\s+/g, "\\s*"), "gi");
    const afterStart = normalizedText.substring(startIndex + 200);
    const match = simplePattern.exec(afterStart);
    if (match) {
      endIndex = startIndex + 200 + match.index;
      break;
    }
  }
  
  // 최소 5000자 이상 추출
  const minLength = 5000;
  if (endIndex - startIndex < minLength) {
    endIndex = Math.min(startIndex + minLength, normalizedText.length);
  }
  
  return normalizedText.substring(startIndex, endIndex);
}

// 단위 변환
function normalizeToMillions(value: number, unit: string): number {
  if (unit.includes("천원") || unit.includes("천 원")) {
    return Math.round(value / 1000);
  }
  if (unit === "원" || (!unit.includes("백만") && !unit.includes("억") && !unit.includes("천"))) {
    return Math.round(value / 1000000);
  }
  if (unit.includes("억")) {
    return Math.round(value * 100);
  }
  return Math.round(value);
}

// PDF 텍스트에서 재무 데이터 추출
function extractFinancialData(text: string) {
  const normalizedText = normalizeText(text);
  
  // 회사명 추출
  let companyName = "";
  const companyMatch = normalizedText.match(/([가-힣A-Za-z0-9]+(?:\s*건축사사무소)?)\s*주식회사/);
  if (companyMatch) {
    companyName = companyMatch[0].replace(/와\s*그\s*종속회사/g, "").trim();
    // 회계법인 제외
    if (companyName.includes("삼정") || companyName.includes("회계법인") || companyName.includes("감사")) {
      companyName = "";
    }
  }
  
  // 회사명을 못 찾으면 다른 패턴 시도
  if (!companyName) {
    const titleMatch = text.match(/([가-힣]+(?:건축사사무소|그룹|전자|테크))\s*주식회사/);
    if (titleMatch) {
      companyName = titleMatch[0].trim();
    }
  }
  
  console.log("[v0] Company name:", companyName);
  
  // 회계연도 추출
  let fiscalYear = "";
  let priorYear = "";
  
  const yearMatches = [...normalizedText.matchAll(/제\s*(\d+)\s*기\s*(\d{4})년/g)];
  if (yearMatches.length >= 2) {
    fiscalYear = yearMatches[0][2];
    priorYear = yearMatches[1][2];
  } else {
    const singleYearMatch = normalizedText.match(/(\d{4})년\s*12월\s*31일/);
    if (singleYearMatch) {
      fiscalYear = singleYearMatch[1];
      priorYear = String(parseInt(fiscalYear) - 1);
    }
  }
  
  console.log("[v0] Fiscal year:", fiscalYear, "Prior year:", priorYear);

  // 단위 확인
  let unit = "원"; // 기본값을 원으로 설정
  const unitMatch = normalizedText.match(/단위\s*[:：]?\s*(천원|백만원|원|억원)/i);
  if (unitMatch) {
    unit = unitMatch[1];
  }
  console.log("[v0] Unit:", unit);

  // 각 섹션 추출
  const bsSection = extractSection(text, 
    ["연결재무상태표", "재무상태표"], 
    ["연결포괄손익", "포괄손익", "자본변동표"]
  );
  
  const isSection = extractSection(text,
    ["연결포괄손익계산서", "포괄손익계산서", "손익계산서"],
    ["연결자본변동표", "자본변동표", "현금흐름표"]
  );
  
  const cfSection = extractSection(text,
    ["연결현금흐름표", "현금흐름표"],
    ["주석", "외부감사"]
  );
  
  console.log("[v0] Balance Sheet section length:", bsSection.length);
  console.log("[v0] Income Statement section length:", isSection.length);
  console.log("[v0] Cash Flow section length:", cfSection.length);

  // 손익계산서 항목
  const [revenue, priorRevenue] = extractTwoNumbers(isSection.length > 500 ? isSection : text, [
    "매출액", "영���수익", "수익합계"
  ]);
  
  const [operatingIncome, priorOperatingIncome] = extractTwoNumbers(isSection.length > 500 ? isSection : text, [
    "영업이익", "영업손익"
  ]);
  
  const [netIncome, priorNetIncome] = extractTwoNumbers(isSection.length > 500 ? isSection : text, [
    "당기순이익", "당기순손익", "연결당기순이익"
  ]);

  // 재무상태표 항목
  const [totalAssets, priorTotalAssets] = extractTwoNumbers(bsSection.length > 500 ? bsSection : text, [
    "자산총계"
  ]);
  
  const [totalLiabilities, priorTotalLiabilities] = extractTwoNumbers(bsSection.length > 500 ? bsSection : text, [
    "부채총계", "부채 총계", "부 채 총 계"
  ]);
  
  const [totalEquity, priorTotalEquity] = extractTwoNumbers(bsSection.length > 500 ? bsSection : text, [
    "자본총계"
  ]);
  
  const [currentAssets, priorCurrentAssets] = extractTwoNumbers(bsSection.length > 500 ? bsSection : text, [
    "유동자산"
  ]);
  
  const [currentLiabilities, priorCurrentLiabilities] = extractTwoNumbers(bsSection.length > 500 ? bsSection : text, [
    "유동부채"
  ]);
  
  const [inventory, priorInventory] = extractTwoNumbers(bsSection.length > 500 ? bsSection : text, [
    "재고자산"
  ]);
  
  const [receivables, priorReceivables] = extractTwoNumbers(bsSection.length > 500 ? bsSection : text, [
    "매출채권", "매출채권및기타채권"
  ]);
  
  const [cash, priorCash] = extractTwoNumbers(bsSection.length > 500 ? bsSection : text, [
    "현금및현금성자산"
  ]);

  // 현금흐름표 항목 - 전체 텍스트에서 검색 (현금흐름표 섹션이 짧거나 키워드가 다를 수 있음)
  // PDF 원본에서 공백이 포함될 수 있으므로 전체 텍스트에서 검색
  console.log("[v0] CF section preview:", cfSection.substring(0, 500));
  
  const [operatingCashFlow, priorOperatingCashFlow] = extractTwoNumbers(text, [
    "영업활동으로인한현금흐름", "영업활동현금흐름", "영업활동으로 인한 현금흐름", 
    "I. 영업활동현금흐름", "Ⅰ. 영업활동현금흐름", "영업활동 현금흐름"
  ]);
  
  const [investingCashFlow, priorInvestingCashFlow] = extractTwoNumbers(text, [
    "투자활동으로인한현금흐름", "투자활동현금흐름", "투자활동으로 인한 현금흐름", 
    "II. 투자활동현금흐름", "Ⅱ. 투자활동현금흐름", "투자활동 현금흐름"
  ]);
  
  const [financingCashFlow, priorFinancingCashFlow] = extractTwoNumbers(text, [
    "재무활동으로인한현금흐름", "재무활동현금흐름", "재무활동으로 인한 현금흐름", 
    "III. 재무활동현금흐름", "Ⅲ. 재무활동현금흐름", "재무활동 현금흐름"
  ]);

  // 디버그: 현금흐름 추출 결과
  console.log("[v0] Operating CF raw:", operatingCashFlow, priorOperatingCashFlow);
  console.log("[v0] Investing CF raw:", investingCashFlow, priorInvestingCashFlow);
  console.log("[v0] Financing CF raw:", financingCashFlow, priorFinancingCashFlow);
  console.log("[v0] Total Liabilities raw:", totalLiabilities, priorTotalLiabilities);

  // 단위 변환
  const convert = (val: number) => normalizeToMillions(val, unit);

  const result = {
    companyName,
    fiscalYear,
    revenue: convert(revenue),
    operatingIncome: convert(operatingIncome),
    netIncome: convert(netIncome),
    totalAssets: convert(totalAssets),
    totalLiabilities: convert(totalLiabilities),
    totalEquity: convert(totalEquity),
    currentAssets: convert(currentAssets),
    currentLiabilities: convert(currentLiabilities),
    inventory: convert(inventory),
    receivables: convert(receivables),
    cash: convert(cash),
    operatingCashFlow: convert(operatingCashFlow),
    investingCashFlow: convert(investingCashFlow),
    financingCashFlow: convert(financingCashFlow),
    priorYearData: {
      year: priorYear,
      revenue: convert(priorRevenue),
      operatingIncome: convert(priorOperatingIncome),
      netIncome: convert(priorNetIncome),
      totalAssets: convert(priorTotalAssets),
      totalLiabilities: convert(priorTotalLiabilities),
      totalEquity: convert(priorTotalEquity),
      currentAssets: convert(priorCurrentAssets),
      currentLiabilities: convert(priorCurrentLiabilities),
      inventory: convert(priorInventory),
      receivables: convert(priorReceivables),
      cash: convert(priorCash),
      operatingCashFlow: convert(priorOperatingCashFlow),
      investingCashFlow: convert(priorInvestingCashFlow),
      financingCashFlow: convert(priorFinancingCashFlow),
    } as YearlyFinancialData,
    unit: "백만원",
  };
  
  console.log("[v0] Extracted financial data:", JSON.stringify(result, null, 2));
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // PDF 텍스트 추출
    let text = "";
    try {
      const result = await extractText(buffer, { mergePages: true });
      if (Array.isArray(result.text)) {
        text = result.text.join("\n");
      } else if (typeof result.text === "string") {
        text = result.text;
      } else {
        text = String(result.text || "");
      }
      console.log("[v0] PDF text extracted, length:", text.length);
    } catch (pdfError) {
      console.error("[v0] PDF extraction error:", pdfError);
      return NextResponse.json(
        { error: "PDF 텍스트 추출에 실패했습니다.", details: String(pdfError) },
        { status: 500 }
      );
    }
    
    if (!text || text.length < 100) {
      return NextResponse.json(
        { error: "PDF에서 텍스트를 추출할 수 없습니다." },
        { status: 400 }
      );
    }

    const financialData = extractFinancialData(text);

    return NextResponse.json({
      success: true,
      data: financialData,
      rawTextPreview: text.substring(0, 2000),
    });
  } catch (error) {
    console.error("[v0] PDF parsing error:", error);
    return NextResponse.json(
      { error: "PDF 파싱 중 오류가 발생했습니다.", details: String(error) },
      { status: 500 }
    );
  }
}
