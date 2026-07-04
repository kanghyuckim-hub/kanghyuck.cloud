import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";

// Colors
const PRIMARY_DARK = "0a0a0f";
const PRIMARY_BLUE = "3b82f6";
const PRIMARY_VIOLET = "8b5cf6";
const ACCENT_GREEN = "10b981";
const ACCENT_AMBER = "f59e0b";
const ACCENT_RED = "ef4444";
const TEXT_WHITE = "ffffff";
const TEXT_GRAY = "a1a1aa";
const BG_CARD = "18181b";

function formatNumber(num: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(num));
}

function formatBillion(num: number): string {
  return (num / 1000).toFixed(1) + "억";
}

function formatPercent(num: number): string {
  return num.toFixed(1) + "%";
}

export async function POST(request: NextRequest) {
  try {
    const { financialData, ratios, valuations, projections, peerCompanies, industryAverage } = await request.json();

    const pptx = new PptxGenJS();
    pptx.author = "Financial Analysis System";
    pptx.title = `${financialData.companyName} 투자분석 보고서`;
    pptx.subject = "Investment Research Report";
    pptx.company = financialData.companyName;
    pptx.layout = "LAYOUT_16x9";

    // Helper functions
    const addHeader = (slide: PptxGenJS.Slide, title: string, subtitle?: string) => {
      slide.addText(title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, bold: true, color: TEXT_WHITE });
      if (subtitle) {
        slide.addText(subtitle, { x: 0.5, y: 0.75, w: 9, h: 0.3, fontSize: 12, color: TEXT_GRAY });
      }
    };

    const addFooter = (slide: PptxGenJS.Slide, pageNum: number) => {
      slide.addText(`${financialData.companyName} | Investment Research Report`, { x: 0.5, y: 5.1, w: 6, h: 0.2, fontSize: 8, color: TEXT_GRAY });
      slide.addText(`${pageNum}`, { x: 9.2, y: 5.1, w: 0.5, h: 0.2, fontSize: 8, color: TEXT_GRAY, align: "right" });
    };

    // Slide 1: Title
    const slide1 = pptx.addSlide();
    slide1.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: PRIMARY_DARK } });
    slide1.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.08, fill: { type: "solid", color: PRIMARY_BLUE } });
    slide1.addText("INVESTMENT RESEARCH REPORT", { x: 0.5, y: 1.5, w: 9, h: 0.4, fontSize: 14, color: PRIMARY_BLUE, bold: true });
    slide1.addText(financialData.companyName || "기업명", { x: 0.5, y: 2, w: 9, h: 1, fontSize: 44, bold: true, color: TEXT_WHITE });
    slide1.addText(`${financialData.industry || "건축설계/엔지니어링"} | ${financialData.fiscalYear}년 기준`, { x: 0.5, y: 3, w: 9, h: 0.4, fontSize: 16, color: TEXT_GRAY });
    
    const investmentRating = ratios.roe > industryAverage.roe * 1.1 ? "BUY" : ratios.roe > industryAverage.roe * 0.8 ? "HOLD" : "SELL";
    const ratingColor = investmentRating === "BUY" ? ACCENT_GREEN : investmentRating === "HOLD" ? ACCENT_AMBER : ACCENT_RED;
    slide1.addShape("rect", { x: 0.5, y: 3.8, w: 1.5, h: 0.5, fill: { color: ratingColor }, rounding: 0.1 });
    slide1.addText(investmentRating, { x: 0.5, y: 3.8, w: 1.5, h: 0.5, fontSize: 18, bold: true, color: TEXT_WHITE, align: "center", valign: "middle" });
    slide1.addText(`적정 기업가치: ${formatBillion(valuations.average)}원`, { x: 2.2, y: 3.85, w: 4, h: 0.4, fontSize: 14, color: TEXT_WHITE });

    // Slide 2: Executive Summary
    const slide2 = pptx.addSlide();
    slide2.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: PRIMARY_DARK } });
    addHeader(slide2, "Executive Summary", "핵심 재무지표 요약");
    
    const summaryData = [
      { label: "매출액", value: formatBillion(financialData.revenue), change: `${ratios.revenueGrowth > 0 ? "+" : ""}${formatPercent(ratios.revenueGrowth)} YoY` },
      { label: "영업이익률", value: formatPercent(ratios.opm), compare: `업종평균 ${formatPercent(industryAverage.opm)}` },
      { label: "ROE", value: formatPercent(ratios.roe), compare: `업종평균 ${formatPercent(industryAverage.roe)}` },
      { label: "부채비율", value: formatPercent(ratios.debtRatio), compare: `업종평균 ${formatPercent(industryAverage.debtRatio)}` },
    ];

    summaryData.forEach((item, i) => {
      const x = 0.5 + (i % 2) * 4.5;
      const y = 1.3 + Math.floor(i / 2) * 1.5;
      slide2.addShape("rect", { x, y, w: 4, h: 1.2, fill: { color: BG_CARD }, rounding: 0.1 });
      slide2.addText(item.label, { x: x + 0.2, y: y + 0.15, w: 3.6, h: 0.3, fontSize: 11, color: TEXT_GRAY });
      slide2.addText(item.value, { x: x + 0.2, y: y + 0.45, w: 3.6, h: 0.4, fontSize: 22, bold: true, color: TEXT_WHITE });
      slide2.addText(item.change || item.compare || "", { x: x + 0.2, y: y + 0.85, w: 3.6, h: 0.25, fontSize: 9, color: TEXT_GRAY });
    });

    slide2.addText("투자의견", { x: 0.5, y: 4.4, w: 9, h: 0.3, fontSize: 12, bold: true, color: TEXT_WHITE });
    const opinionText = `${financialData.companyName}은 ROE ${formatPercent(ratios.roe)}로 업종평균 ${formatPercent(industryAverage.roe)} 대비 ${ratios.roe >= industryAverage.roe ? "우수한" : "개선이 필요한"} 자본효율성을 보이며, 부채비율 ${formatPercent(ratios.debtRatio)}로 ${ratios.debtRatio < industryAverage.debtRatio ? "안정적인" : "다소 높은"} 재무구조를 유지하고 있습니다. 종합 투자의견: ${investmentRating}`;
    slide2.addText(opinionText, { x: 0.5, y: 4.7, w: 9, h: 0.6, fontSize: 10, color: TEXT_GRAY, wrap: true });
    addFooter(slide2, 2);

    // Slide 3: Financial Ratios
    const slide3 = pptx.addSlide();
    slide3.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: PRIMARY_DARK } });
    addHeader(slide3, "재무비율 분석", "수익성 및 안정성 지표");

    const ratioRows = [
      ["지표", "당사", "업종평균", "산식"],
      ["영업이익률 (OPM)", formatPercent(ratios.opm), formatPercent(industryAverage.opm), "영업이익 ÷ 매출액 × 100"],
      ["순이익률 (NPM)", formatPercent(ratios.npm), formatPercent(industryAverage.npm), "당기순이익 ÷ 매출액 × 100"],
      ["자기자본이익률 (ROE)", formatPercent(ratios.roe), formatPercent(industryAverage.roe), "당기순이익 ÷ 자기자본 × 100"],
      ["총자산이익률 (ROA)", formatPercent(ratios.roa), formatPercent(industryAverage.roe * 0.5), "당기순이익 ÷ 총자산 × 100"],
      ["부채비율", formatPercent(ratios.debtRatio), formatPercent(industryAverage.debtRatio), "총부채 ÷ 자기자본 × 100"],
      ["유동비율", formatPercent(ratios.currentRatio), formatPercent(industryAverage.currentRatio), "유동자산 ÷ 유동부채 × 100"],
    ];

    slide3.addTable(ratioRows, {
      x: 0.5, y: 1.2, w: 9, h: 2.5,
      colW: [2.5, 1.8, 1.8, 2.9],
      fill: { color: BG_CARD },
      border: { type: "solid", color: "27272a", pt: 0.5 },
      fontFace: "Arial",
      fontSize: 10,
      color: TEXT_WHITE,
      valign: "middle",
      align: "center",
    });
    addFooter(slide3, 3);

    // Slide 4: Valuation
    const slide4 = pptx.addSlide();
    slide4.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: PRIMARY_DARK } });
    addHeader(slide4, "기업가치 평가", "4가지 평가방법론 적용");

    const valuationData = [
      { method: "DCF", value: valuations.dcf, formula: "현금흐름 할인모형" },
      { method: "PER", value: valuations.per, formula: `순이익 × 업종PER(${industryAverage.per}x)` },
      { method: "PBR", value: valuations.pbr, formula: `자기자본 × 업종PBR(${industryAverage.pbr}x)` },
      { method: "EV/EBITDA", value: valuations.evEbitda, formula: `EBITDA × 업종배수(${industryAverage.evEbitda}x)` },
    ];

    valuationData.forEach((item, i) => {
      const x = 0.5 + i * 2.25;
      slide4.addShape("rect", { x, y: 1.3, w: 2.1, h: 1.8, fill: { color: BG_CARD }, rounding: 0.1 });
      slide4.addText(item.method, { x, y: 1.4, w: 2.1, h: 0.3, fontSize: 12, bold: true, color: PRIMARY_BLUE, align: "center" });
      slide4.addText(formatBillion(item.value) + "원", { x, y: 1.75, w: 2.1, h: 0.4, fontSize: 18, bold: true, color: TEXT_WHITE, align: "center" });
      slide4.addText(item.formula, { x: x + 0.1, y: 2.3, w: 1.9, h: 0.6, fontSize: 8, color: TEXT_GRAY, align: "center", wrap: true });
    });

    slide4.addShape("rect", { x: 0.5, y: 3.4, w: 9, h: 0.8, fill: { color: PRIMARY_BLUE }, rounding: 0.1 });
    slide4.addText("적정 기업가치 (4개 방법론 평균)", { x: 0.7, y: 3.5, w: 5, h: 0.3, fontSize: 12, color: TEXT_WHITE });
    slide4.addText(formatBillion(valuations.average) + "원", { x: 6, y: 3.45, w: 3.3, h: 0.6, fontSize: 28, bold: true, color: TEXT_WHITE, align: "right" });
    addFooter(slide4, 4);

    // Slide 5: Peer Comparison
    const slide5 = pptx.addSlide();
    slide5.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: PRIMARY_DARK } });
    addHeader(slide5, "동종업계 비교", "건축설계/엔지니어링 업종 상장기업");

    const peerRows = [
      ["기업명", "매출액", "PER", "PBR", "ROE", "OPM"],
      [financialData.companyName + " (분석대상)", formatBillion(financialData.revenue), "-", "-", formatPercent(ratios.roe), formatPercent(ratios.opm)],
      ...peerCompanies.slice(0, 4).map((p: { name: string; revenue: number; per: number; pbr: number; roe: number; opm: number }) => [
        p.name, formatBillion(p.revenue), p.per.toFixed(1) + "x", p.pbr.toFixed(1) + "x", formatPercent(p.roe), formatPercent(p.opm)
      ]),
      ["업종 평균", "-", industryAverage.per.toFixed(1) + "x", industryAverage.pbr.toFixed(1) + "x", formatPercent(industryAverage.roe), formatPercent(industryAverage.opm)],
    ];

    slide5.addTable(peerRows, {
      x: 0.3, y: 1.2, w: 9.4, h: 2.8,
      colW: [2.8, 1.3, 1.1, 1.1, 1.1, 1.1],
      fill: { color: BG_CARD },
      border: { type: "solid", color: "27272a", pt: 0.5 },
      fontFace: "Arial",
      fontSize: 9,
      color: TEXT_WHITE,
      valign: "middle",
      align: "center",
    });
    slide5.addText("출처: 네이버 금융 (finance.naver.com) 건축설계/엔지니어링 업종, 2024년 기준", { x: 0.5, y: 4.2, w: 9, h: 0.3, fontSize: 8, color: TEXT_GRAY });
    addFooter(slide5, 5);

    // Slide 6: 3-Year Projections
    const slide6 = pptx.addSlide();
    slide6.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: PRIMARY_DARK } });
    addHeader(slide6, "3개년 실적 전망", "매출 및 이익 추정");

    const projectionRows = [
      ["구분", `${financialData.fiscalYear}(A)`, ...projections.map((p: { year: number }) => `${p.year}(E)`)],
      ["매출액 (백만원)", formatNumber(financialData.revenue), ...projections.map((p: { revenue: number }) => formatNumber(p.revenue))],
      ["영업이익 (백만원)", formatNumber(financialData.operatingIncome), ...projections.map((p: { operatingIncome: number }) => formatNumber(p.operatingIncome))],
      ["당기순이익 (백만원)", formatNumber(financialData.netIncome), ...projections.map((p: { netIncome: number }) => formatNumber(p.netIncome))],
      ["영업이익률 (%)", formatPercent(ratios.opm), ...projections.map((p: { opm: number }) => formatPercent(p.opm))],
    ];

    slide6.addTable(projectionRows, {
      x: 0.5, y: 1.2, w: 9, h: 2,
      colW: [2.5, 1.6, 1.6, 1.6, 1.7],
      fill: { color: BG_CARD },
      border: { type: "solid", color: "27272a", pt: 0.5 },
      fontFace: "Arial",
      fontSize: 10,
      color: TEXT_WHITE,
      valign: "middle",
      align: "center",
    });

    slide6.addText("전망 가정", { x: 0.5, y: 3.5, w: 9, h: 0.3, fontSize: 11, bold: true, color: TEXT_WHITE });
    slide6.addText(`• 매출 성장률: ${financialData.fiscalYear}년 실적 기준 점진적 둔화 가정\n• 영업이익률: 규모의 경제 효과로 연간 0.2%p 개선 가정\n• 국내 건설경기 점진적 회복 및 친환경/스마트 건축 수요 증가 전제`, 
      { x: 0.5, y: 3.8, w: 9, h: 1, fontSize: 9, color: TEXT_GRAY, wrap: true });
    addFooter(slide6, 6);

    // Slide 7: Investment Opinion
    const slide7 = pptx.addSlide();
    slide7.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: PRIMARY_DARK } });
    addHeader(slide7, "투자의견 요약", "Investment Thesis");

    slide7.addShape("rect", { x: 0.5, y: 1.2, w: 9, h: 1, fill: { color: ratingColor }, rounding: 0.1 });
    slide7.addText(`투자의견: ${investmentRating}`, { x: 0.7, y: 1.3, w: 4, h: 0.4, fontSize: 18, bold: true, color: TEXT_WHITE });
    slide7.addText(`적정 기업가치: ${formatBillion(valuations.average)}원`, { x: 0.7, y: 1.7, w: 4, h: 0.4, fontSize: 14, color: TEXT_WHITE });
    slide7.addText(`장부가 대비 ${(valuations.average / financialData.totalEquity).toFixed(1)}x`, { x: 6, y: 1.5, w: 3.3, h: 0.4, fontSize: 12, color: TEXT_WHITE, align: "right" });

    slide7.addText("투자 포인트", { x: 0.5, y: 2.5, w: 4, h: 0.3, fontSize: 12, bold: true, color: ACCENT_GREEN });
    const positives = [];
    if (ratios.roe >= industryAverage.roe) positives.push(`ROE ${formatPercent(ratios.roe)}로 업종평균 상회`);
    if (ratios.debtRatio < industryAverage.debtRatio) positives.push(`안정적 재무구조 (부채비율 ${formatPercent(ratios.debtRatio)})`);
    if (financialData.operatingCashFlow > 0) positives.push(`영업현금흐름 ${formatBillion(financialData.operatingCashFlow)}원 창출`);
    slide7.addText(positives.map(p => "• " + p).join("\n"), { x: 0.5, y: 2.8, w: 4.2, h: 1.2, fontSize: 9, color: TEXT_GRAY, wrap: true });

    slide7.addText("리스크 요인", { x: 5, y: 2.5, w: 4, h: 0.3, fontSize: 12, bold: true, color: ACCENT_AMBER });
    const negatives = [];
    if (ratios.roe < industryAverage.roe) negatives.push(`ROE ${formatPercent(ratios.roe)}로 업종평균 하회`);
    if (ratios.debtRatio > industryAverage.debtRatio) negatives.push(`부채비율 ${formatPercent(ratios.debtRatio)}로 다소 높음`);
    negatives.push("건설경기 침체 장기화 리스크");
    slide7.addText(negatives.map(n => "• " + n).join("\n"), { x: 5, y: 2.8, w: 4.5, h: 1.2, fontSize: 9, color: TEXT_GRAY, wrap: true });

    slide7.addText("Disclaimer: 본 보고서는 공개된 재무정보 기반 자동 생성 자료이며, 투자 권유 목적이 아닙니다. 투자 결정 시 전문가 상담을 권고합니다.", 
      { x: 0.5, y: 4.6, w: 9, h: 0.4, fontSize: 7, color: TEXT_GRAY, wrap: true });
    addFooter(slide7, 7);

    // Generate PPT
    const pptxBuffer = await pptx.write({ outputType: "nodebuffer" });
    const safeFilename = "Investment_Research_Report.pptx";
    const koreanFilename = `${financialData.companyName || "기업"}_투자분석보고서.pptx`;
    const encodedFilename = encodeURIComponent(koreanFilename);

    return new NextResponse(pptxBuffer as Buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("PPT generation error:", error);
    return NextResponse.json({ error: "PPT 생성 중 오류가 발생했습니다.", details: String(error) }, { status: 500 });
  }
}
