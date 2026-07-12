"use client";

import { useState, useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Upload,
  FileText,
  TrendingUp,
  TrendingDown,
  Building2,
  Download,
  ChevronRight,
  BarChart3,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  Calculator,
  Layers,
  ExternalLink,
  LineChart,
  ClipboardList,
  Scale,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

const SIDEBAR_MENUS = [
  { label: "재무분석", href: "/business-analysis", icon: LineChart },
  { label: "월간실적보고", href: "/auto-report", icon: ClipboardList },
  { label: "실적추정", href: "/performance-estimate", icon: SlidersHorizontal },
];

// Types
interface FinancialData {
  companyName: string;
  fiscalYear: string;
  industry: string;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  priorRevenue: number;
  priorOperatingIncome: number;
  priorNetIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  currentAssets: number;
  currentLiabilities: number;
  inventory: number;
  cash: number;
  priorTotalAssets: number;
  priorTotalEquity: number;
  priorCash: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  priorOperatingCashFlow: number;
  priorInvestingCashFlow: number;
  priorFinancingCashFlow: number;
  receivables: number;
}

interface ValuationInputs {
  discountRate: number;
  growthRate: number;
  terminalGrowthRate: number;
  projectionYears: number;
}

// 동종업계 비교 기업 데이터 (건축설계/엔지니어링 업종)
const PEER_COMPANIES = [
  { name: "희림종합건축사사무소", ticker: "037440", per: 12.5, pbr: 1.2, evEbitda: 7.8, roe: 9.6, opm: 8.2, revenue: 152000, source: "네이버금융 2024.12" },
  { name: "종합건축사사무소효익", ticker: "095720", per: 8.3, pbr: 0.9, evEbitda: 5.2, roe: 10.8, opm: 7.5, revenue: 48000, source: "네이버금융 2024.12" },
  { name: "한국토지신탁", ticker: "034830", per: 6.8, pbr: 0.7, evEbitda: 4.5, roe: 10.3, opm: 15.2, revenue: 285000, source: "네이버금융 2024.12" },
  { name: "한미글로벌", ticker: "053690", per: 11.2, pbr: 1.4, evEbitda: 6.8, roe: 12.5, opm: 9.8, revenue: 320000, source: "네이버금융 2024.12" },
  { name: "이테크건설", ticker: "016250", per: 7.5, pbr: 0.8, evEbitda: 4.2, roe: 10.7, opm: 6.5, revenue: 890000, source: "네이버금융 2024.12" },
];

const INDUSTRY_AVERAGE = {
  per: 9.3,
  pbr: 1.0,
  evEbitda: 5.7,
  roe: 10.8,
  opm: 9.4,
  npm: 6.8,
  debtRatio: 85,
  currentRatio: 145,
};

const initialFinancialData: FinancialData = {
  companyName: "",
  fiscalYear: "",
  industry: "건축설계/엔지니어링",
  revenue: 0, operatingIncome: 0, netIncome: 0,
  priorRevenue: 0, priorOperatingIncome: 0, priorNetIncome: 0,
  totalAssets: 0, totalLiabilities: 0, totalEquity: 0,
  currentAssets: 0, currentLiabilities: 0, inventory: 0,
  cash: 0, receivables: 0,
  priorTotalAssets: 0, priorTotalEquity: 0, priorCash: 0,
  operatingCashFlow: 0, investingCashFlow: 0, financingCashFlow: 0,
  priorOperatingCashFlow: 0, priorInvestingCashFlow: 0, priorFinancingCashFlow: 0,
};

const initialValuationInputs: ValuationInputs = {
  discountRate: 10,
  growthRate: 5,
  terminalGrowthRate: 2,
  projectionYears: 5,
};

function calculateRatiosFor(financialData: FinancialData) {
  const { revenue, operatingIncome, netIncome, totalAssets, totalLiabilities, totalEquity, currentAssets, currentLiabilities, priorRevenue, priorNetIncome, priorOperatingIncome, priorTotalAssets, priorTotalEquity } = financialData;
  return {
    opm: revenue > 0 ? (operatingIncome / revenue) * 100 : 0,
    npm: revenue > 0 ? (netIncome / revenue) * 100 : 0,
    roe: totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0,
    roa: totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0,
    priorOpm: priorRevenue > 0 ? (priorOperatingIncome / priorRevenue) * 100 : 0,
    priorNpm: priorRevenue > 0 ? (priorNetIncome / priorRevenue) * 100 : 0,
    priorRoe: priorTotalEquity > 0 ? (priorNetIncome / priorTotalEquity) * 100 : 0,
    priorRoa: priorTotalAssets > 0 ? (priorNetIncome / priorTotalAssets) * 100 : 0,
    debtRatio: totalEquity > 0 ? (totalLiabilities / totalEquity) * 100 : 0,
    currentRatio: currentLiabilities > 0 ? (currentAssets / currentLiabilities) * 100 : 0,
    equityRatio: totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0,
    revenueGrowth: priorRevenue > 0 ? ((revenue - priorRevenue) / priorRevenue) * 100 : 0,
    netIncomeGrowth: priorNetIncome !== 0 ? ((netIncome - priorNetIncome) / Math.abs(priorNetIncome)) * 100 : 0,
    opIncomeGrowth: priorOperatingIncome !== 0 ? ((operatingIncome - priorOperatingIncome) / Math.abs(priorOperatingIncome)) * 100 : 0,
    assetGrowth: priorTotalAssets > 0 ? ((totalAssets - priorTotalAssets) / priorTotalAssets) * 100 : 0,
  };
}

function calculateValuationsFor(financialData: FinancialData, valuationInputs: ValuationInputs) {
  const { netIncome, totalEquity, operatingIncome, totalLiabilities, cash } = financialData;
  const { discountRate, terminalGrowthRate, projectionYears } = valuationInputs;
  const fcf = netIncome * 1.1;
  let dcfValue = 0;
  for (let i = 1; i <= projectionYears; i++) {
    const projectedFcf = fcf * Math.pow(1.03, i);
    dcfValue += projectedFcf / Math.pow(1 + discountRate / 100, i);
  }
  const terminalValue = (fcf * Math.pow(1.03, projectionYears) * (1 + terminalGrowthRate / 100)) / ((discountRate - terminalGrowthRate) / 100);
  dcfValue += terminalValue / Math.pow(1 + discountRate / 100, projectionYears);
  const perValue = netIncome * INDUSTRY_AVERAGE.per;
  const pbrValue = totalEquity * INDUSTRY_AVERAGE.pbr;
  const ebitda = operatingIncome * 1.2;
  const evEbitdaValue = ebitda * INDUSTRY_AVERAGE.evEbitda - totalLiabilities + cash;
  return { dcf: dcfValue, per: perValue, pbr: pbrValue, evEbitda: Math.max(0, evEbitdaValue), average: (dcfValue + perValue + pbrValue + Math.max(0, evEbitdaValue)) / 4 };
}

function getInvestmentRatingFor(roe: number): "BUY" | "HOLD" | "SELL" {
  return roe > INDUSTRY_AVERAGE.roe * 1.1 ? "BUY" : roe > INDUSTRY_AVERAGE.roe * 0.8 ? "HOLD" : "SELL";
}

// 비교 테이블에서 열(지표) 기준 최고/최저값 강조
function highlightClass(value: number, all: number[], higherIsBetter: boolean = true): string {
  if (all.length < 2) return "";
  const max = Math.max(...all);
  const min = Math.min(...all);
  if (max === min) return "";
  const isBest = higherIsBetter ? value === max : value === min;
  const isWorst = higherIsBetter ? value === min : value === max;
  if (isBest) return "text-emerald-600";
  if (isWorst) return "text-rose-600";
  return "text-slate-700";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapParsedData(d: any): FinancialData {
  return {
    companyName: d.companyName || "",
    fiscalYear: d.fiscalYear || "",
    industry: "건축설계/엔지니어링",
    revenue: d.revenue || 0,
    operatingIncome: d.operatingIncome || 0,
    netIncome: d.netIncome || 0,
    priorRevenue: d.priorYearData?.revenue || 0,
    priorOperatingIncome: d.priorYearData?.operatingIncome || 0,
    priorNetIncome: d.priorYearData?.netIncome || 0,
    totalAssets: d.totalAssets || 0,
    totalLiabilities: d.totalLiabilities || 0,
    totalEquity: d.totalEquity || 0,
    currentAssets: d.currentAssets || 0,
    currentLiabilities: d.currentLiabilities || 0,
    inventory: d.inventory || 0,
    cash: d.cash || 0,
    receivables: d.receivables || 0,
    priorTotalAssets: d.priorYearData?.totalAssets || 0,
    priorTotalEquity: d.priorYearData?.totalEquity || 0,
    priorCash: d.priorYearData?.cash || 0,
    operatingCashFlow: d.operatingCashFlow || 0,
    investingCashFlow: d.investingCashFlow || 0,
    financingCashFlow: d.financingCashFlow || 0,
    priorOperatingCashFlow: d.priorYearData?.operatingCashFlow || 0,
    priorInvestingCashFlow: d.priorYearData?.investingCashFlow || 0,
    priorFinancingCashFlow: d.priorYearData?.financingCashFlow || 0,
  };
}

interface CompanyReport {
  id: string;
  fileName: string;
  data: FinancialData;
  ratios: ReturnType<typeof calculateRatiosFor>;
  valuations: ReturnType<typeof calculateValuationsFor>;
  rating: "BUY" | "HOLD" | "SELL";
}

const MAX_COMPARE_FILES = 10;

async function parsePdfToFinancialData(uploadedFile: File): Promise<FinancialData> {
  const formData = new FormData();
  formData.append("file", uploadedFile);
  const response = await fetch("/api/parse-pdf", { method: "POST", body: formData });
  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || "PDF에서 재무 데이터를 추출하지 못했습니다.");
  }
  return mapParsedData(result.data);
}

export default function BusinessAnalysisPage() {
  const pathname = usePathname();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData>(initialFinancialData);
  const [valuationInputs, setValuationInputs] = useState<ValuationInputs>(initialValuationInputs);
  const [showResults, setShowResults] = useState(false);
  const [isPptLoading, setIsPptLoading] = useState(false);

  // 비교분석 모드 (2개 이상 파일 업로드 시)
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [compareReports, setCompareReports] = useState<CompanyReport[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareErrors, setCompareErrors] = useState<string[]>([]);

  const resetToUpload = () => {
    setMode("single");
    setStep(1);
    setFile(null);
    setFinancialData(initialFinancialData);
    setShowResults(false);
    setCompareReports([]);
    setCompareErrors([]);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    if (acceptedFiles.length === 1) {
      const uploadedFile = acceptedFiles[0];
      setMode("single");
      setFile(uploadedFile);
      setIsLoading(true);
      try {
        const data = await parsePdfToFinancialData(uploadedFile);
        setFinancialData(data);
        setStep(2);
      } catch (error) {
        console.error("PDF parsing error:", error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 파일 2개 이상: 비교분석 모드로 전환, 각 파일을 병렬 파싱
    setMode("compare");
    setCompareLoading(true);
    setCompareErrors([]);
    setCompareReports([]);

    const results = await Promise.allSettled(
      acceptedFiles.map((f) => parsePdfToFinancialData(f))
    );

    const reports: CompanyReport[] = [];
    const errors: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        const data = result.value;
        const ratios = calculateRatiosFor(data);
        const valuations = calculateValuationsFor(data, initialValuationInputs);
        reports.push({
          id: `${acceptedFiles[i].name}-${i}`,
          fileName: acceptedFiles[i].name,
          data,
          ratios,
          valuations,
          rating: getInvestmentRatingFor(ratios.roe),
        });
      } else {
        errors.push(`${acceptedFiles[i].name}: ${result.reason instanceof Error ? result.reason.message : "분석 실패"}`);
      }
    });

    setCompareReports(reports);
    setCompareErrors(errors);
    setCompareLoading(false);
  }, []);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    if (rejections.some((r) => r.errors.some((e) => e.code === "too-many-files"))) {
      setCompareErrors([`한 번에 최대 ${MAX_COMPARE_FILES}개까지 업로드할 수 있습니다.`]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: MAX_COMPARE_FILES,
  });

  const calculateRatios = () => calculateRatiosFor(financialData);
  const calculateValuations = () => calculateValuationsFor(financialData, valuationInputs);

  const generateProjections = () => {
    const { revenue, operatingIncome, netIncome } = financialData;
    const ratios = calculateRatios();
    const baseGrowth = Math.max(Math.min(ratios.revenueGrowth, 15), 3);
    const projections = [];
    for (let i = 1; i <= 3; i++) {
      const growthRate = baseGrowth * (1 - (i - 1) * 0.15);
      const projRevenue = Math.round(revenue * Math.pow(1 + growthRate / 100, i));
      const projOpm = Math.min(ratios.opm * (1 + 0.02 * i), 15);
      const projOperatingIncome = Math.round(projRevenue * projOpm / 100);
      const projNetIncome = Math.round(projOperatingIncome * 0.75);
      projections.push({ year: parseInt(financialData.fiscalYear || "2025") + i, revenue: projRevenue, operatingIncome: projOperatingIncome, netIncome: projNetIncome, opm: projOpm, growthRate });
    }
    return projections;
  };

  const runAnalysis = () => { setShowResults(true); setStep(4); };

  const downloadPPT = async () => {
    setIsPptLoading(true);
    try {
      const ratios = calculateRatios();
      const valuations = calculateValuations();
      const projections = generateProjections();
      const response = await fetch("/api/generate-ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialData, ratios, valuations, projections, peerCompanies: PEER_COMPANIES, industryAverage: INDUSTRY_AVERAGE }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${financialData.companyName || "기업"}_투자분석보고서.pptx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("PPT download error:", error);
    } finally {
      setIsPptLoading(false);
    }
  };

  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(Math.round(num));
  const formatPercent = (num: number) => (isNaN(num) || !isFinite(num) ? "0.0" : num.toFixed(1)) + "%";
  const formatBillion = (num: number) => (num / 1000).toFixed(1) + "억";
  const parseNumberInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
  };

  const ratios = calculateRatios();
  const valuations = showResults ? calculateValuations() : null;
  const projections = showResults ? generateProjections() : [];

  const getStatusColor = (value: number, good: number, warning: number, higher: boolean = true) => {
    if (higher) {
      if (value >= good) return "text-emerald-600";
      if (value >= warning) return "text-amber-600";
      return "text-rose-600";
    } else {
      if (value <= good) return "text-emerald-600";
      if (value <= warning) return "text-amber-600";
      return "text-rose-600";
    }
  };

  const getStatusBg = (value: number, good: number, warning: number, higher: boolean = true) => {
    if (higher) {
      if (value >= good) return "bg-emerald-50 border-emerald-200";
      if (value >= warning) return "bg-amber-50 border-amber-200";
      return "bg-rose-50 border-rose-200";
    } else {
      if (value <= good) return "bg-emerald-50 border-emerald-200";
      if (value <= warning) return "bg-amber-50 border-amber-200";
      return "bg-rose-50 border-rose-200";
    }
  };

  const investmentRating = ratios.roe > INDUSTRY_AVERAGE.roe * 1.1 ? "BUY" : ratios.roe > INDUSTRY_AVERAGE.roe * 0.8 ? "HOLD" : "SELL";
  const ratingColor = investmentRating === "BUY" ? "bg-emerald-500 text-white" : investmentRating === "HOLD" ? "bg-amber-500 text-white" : "bg-rose-500 text-white";
  const ratingBorder = investmentRating === "BUY" ? "border-emerald-500" : investmentRating === "HOLD" ? "border-amber-500" : "border-rose-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Financial Analysis</h1>
              <p className="text-xs text-slate-500">Investment Research Report</p>
            </div>
          </div>
          {showResults && (
            <button onClick={downloadPPT} disabled={isPptLoading} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50">
              <Download className="w-4 h-4" />
              {isPptLoading ? "생성 중..." : "IR 보고서 다운로드"}
            </button>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-65px)] sticky top-[65px] self-start">
          <div className="px-3 py-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">경영분석</p>
            <nav className="space-y-1">
              {SIDEBAR_MENUS.map((menu) => {
                const Icon = menu.icon;
                const isActive = pathname === menu.href;
                return (
                  <Link
                    key={menu.href}
                    href={menu.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    {menu.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8">
        {mode === "single" && (
        <>
        {/* Progress */}
        <div className="flex items-center gap-3 mb-10">
          {[{ num: 1, label: "파일 업로드" }, { num: 2, label: "데이터 확인" }, { num: 3, label: "평가 변수" }, { num: 4, label: "분석 결과" }].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${step >= s.num ? "bg-blue-600 text-white shadow-md shadow-blue-500/25" : "bg-slate-100 text-slate-400 border border-slate-200"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.num ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>{s.num}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < 3 && <ChevronRight className="w-4 h-4 text-slate-300 mx-2" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">감사보고서 업로드</h2>
              <p className="text-slate-500 text-lg">금융감독원 DART 공시시스템의 감사보고서 PDF를 업로드하세요</p>
              <p className="text-slate-400 text-sm mt-2">여러 기업의 PDF를 한 번에 선택하면(최대 {MAX_COMPARE_FILES}개) 자동으로 비교분석 화면으로 이동합니다</p>
            </div>
            <div {...getRootProps()} className={`relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all overflow-hidden ${isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-400 bg-white shadow-sm"}`}>
              <input {...getInputProps()} />
              <div className="relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center">
                  {isLoading ? <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> : <Upload className="w-8 h-8 text-blue-600" />}
                </div>
                <p className="text-xl text-slate-900 mb-2 font-medium">{isLoading ? "PDF 분석 중..." : isDragActive ? "파일을 놓으세요" : "클릭하거나 파일을 드래그하세요"}</p>
                <p className="text-sm text-slate-400">PDF 파일만 지원됩니다 (최대 50MB, 최대 {MAX_COMPARE_FILES}개 동시 선택 가능)</p>
              </div>
            </div>
            {file && (
              <div className="mt-6 flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
            )}
            {compareErrors.length > 0 && (
              <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                {compareErrors.map((e) => <div key={e}>{e}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Data Confirmation */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">재무 데이터 확인</h2>
                <p className="text-slate-500 mt-2">추출된 데이터를 확인하고 필요시 수정하세요</p>
              </div>
              <div className="px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                <span className="text-sm text-slate-500">분석 대상: </span>
                <span className="text-slate-900 font-semibold">{financialData.companyName || "미확인"}</span>
                <span className="text-slate-400 ml-2">| {financialData.fiscalYear}년</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* 손익계산서 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                  <h3 className="text-lg font-semibold text-slate-900">손익계산서</h3>
                </div>
                <div className="space-y-3">
                  {[{ label: "매출액", key: "revenue", priorKey: "priorRevenue" }, { label: "영업이익", key: "operatingIncome", priorKey: "priorOperatingIncome" }, { label: "당기순이익", key: "netIncome", priorKey: "priorNetIncome" }].map((item) => {
                    const current = financialData[item.key as keyof FinancialData] as number;
                    const prior = financialData[item.priorKey as keyof FinancialData] as number;
                    const delta = prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : null;
                    return (
                      <div key={item.key} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-slate-700">{item.label} <span className="text-slate-400 font-normal">(백만원)</span></label>
                          {delta !== null && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${delta > 0 ? "bg-emerald-50 text-emerald-600" : delta < 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                              {delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : delta < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {Math.abs(delta).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><span className="text-[11px] font-semibold text-blue-500">당기</span><input type="text" inputMode="numeric" value={current.toLocaleString("ko-KR")} onChange={(e) => setFinancialData({ ...financialData, [item.key]: parseNumberInput(e.target.value) })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm text-right tabular-nums focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" /></div>
                          <div><span className="text-[11px] font-medium text-slate-400">전기</span><input type="text" inputMode="numeric" value={prior.toLocaleString("ko-KR")} onChange={(e) => setFinancialData({ ...financialData, [item.priorKey]: parseNumberInput(e.target.value) })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm text-right tabular-nums focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 재무상태표 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><PieChart className="w-5 h-5 text-blue-600" /></div>
                  <h3 className="text-lg font-semibold text-slate-900">재무상태표</h3>
                </div>
                <div className="space-y-3">
                  {[{ label: "총자산", key: "totalAssets" }, { label: "총부채", key: "totalLiabilities" }, { label: "총자본", key: "totalEquity" }, { label: "유동자산", key: "currentAssets" }, { label: "유동부채", key: "currentLiabilities" }, { label: "현금성자산", key: "cash" }].map((item) => (
                    <div key={item.key} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">{item.label}</label>
                      <input type="text" inputMode="numeric" value={(financialData[item.key as keyof FinancialData] as number).toLocaleString("ko-KR")} onChange={(e) => setFinancialData({ ...financialData, [item.key]: parseNumberInput(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm text-right tabular-nums focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 현금흐름표 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><Layers className="w-5 h-5 text-violet-600" /></div>
                  <h3 className="text-lg font-semibold text-slate-900">현금흐름표</h3>
                </div>
                <div className="space-y-3">
                  {[{ label: "영업활동 CF", key: "operatingCashFlow", priorKey: "priorOperatingCashFlow" }, { label: "투자활동 CF", key: "investingCashFlow", priorKey: "priorInvestingCashFlow" }, { label: "재무활동 CF", key: "financingCashFlow", priorKey: "priorFinancingCashFlow" }].map((item) => {
                    const current = financialData[item.key as keyof FinancialData] as number;
                    const prior = financialData[item.priorKey as keyof FinancialData] as number;
                    const delta = prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : null;
                    return (
                      <div key={item.key} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-slate-700">{item.label}</label>
                          {delta !== null && (
                            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${delta > 0 ? "bg-emerald-50 text-emerald-600" : delta < 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                              {delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : delta < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {Math.abs(delta).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><span className="text-[11px] font-semibold text-blue-500">당기</span><input type="text" inputMode="numeric" value={current.toLocaleString("ko-KR")} onChange={(e) => setFinancialData({ ...financialData, [item.key]: parseNumberInput(e.target.value) })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm text-right tabular-nums focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" /></div>
                          <div><span className="text-[11px] font-medium text-slate-400">전기</span><input type="text" inputMode="numeric" value={prior.toLocaleString("ko-KR")} onChange={(e) => setFinancialData({ ...financialData, [item.priorKey]: parseNumberInput(e.target.value) })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-900 text-sm text-right tabular-nums focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 재무비율 미리보기 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-5 pb-4 border-b border-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                재무비율 미리보기
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 수익성 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">수익성 지표</h4>
                  {[
                    { label: "영업이익률", value: ratios.opm, avg: INDUSTRY_AVERAGE.opm },
                    { label: "순이익률", value: ratios.npm, avg: INDUSTRY_AVERAGE.npm },
                    { label: "ROE", value: ratios.roe, avg: INDUSTRY_AVERAGE.roe },
                    { label: "ROA", value: ratios.roa, avg: 5.0 },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg border ${getStatusBg(item.value, item.avg, item.avg * 0.7)}`}>
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className={`text-sm font-bold ${getStatusColor(item.value, item.avg, item.avg * 0.7)}`}>{formatPercent(item.value)}</span>
                    </div>
                  ))}
                </div>

                {/* 안정성 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">안정성 지표</h4>
                  {[
                    { label: "부채비율", value: ratios.debtRatio, avg: INDUSTRY_AVERAGE.debtRatio, higher: false },
                    { label: "유동비율", value: ratios.currentRatio, avg: INDUSTRY_AVERAGE.currentRatio, higher: true },
                    { label: "자기자본비율", value: ratios.equityRatio, avg: 50, higher: true },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg border ${getStatusBg(item.value, item.avg, item.avg * (item.higher ? 0.7 : 1.3), item.higher)}`}>
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className={`text-sm font-bold ${getStatusColor(item.value, item.avg, item.avg * (item.higher ? 0.7 : 1.3), item.higher)}`}>{formatPercent(item.value)}</span>
                    </div>
                  ))}
                </div>

                {/* 성장성 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">성장성 지표</h4>
                  {[
                    { label: "매출 성장률", value: ratios.revenueGrowth },
                    { label: "영업이익 성장률", value: ratios.opIncomeGrowth },
                    { label: "순이익 성장률", value: ratios.netIncomeGrowth },
                    { label: "자산 성장률", value: ratios.assetGrowth },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg border ${getStatusBg(item.value, 10, 0)}`}>
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className={`text-sm font-bold ${getStatusColor(item.value, 10, 0)}`}>{item.value > 0 ? "+" : ""}{formatPercent(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-5 pt-4 border-t border-slate-100">
                업종평균 대비 색상 표시 (수익성·안정성) 및 전기 대비 증감률 기준 색상 표시 (성장성)입니다. 자세한 산식은 분석 결과(4단계)에서 확인할 수 있습니다.
              </p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all">이전</button>
              <button onClick={() => setStep(3)} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all">다음 단계</button>
            </div>
          </div>
        )}

        {/* Step 3: Valuation Inputs */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">가치평가 변수 설정</h2>
              <p className="text-slate-500 mt-2">DCF 및 상대가치 평가를 위한 변수를 설정하세요</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">할인율 (WACC)</label>
                  <div className="relative">
                    <input type="number" value={valuationInputs.discountRate} onChange={(e) => setValuationInputs({ ...valuationInputs, discountRate: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-lg font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">성장률</label>
                  <div className="relative">
                    <input type="number" value={valuationInputs.growthRate} onChange={(e) => setValuationInputs({ ...valuationInputs, growthRate: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-lg font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">영구 성장률</label>
                  <div className="relative">
                    <input type="number" value={valuationInputs.terminalGrowthRate} onChange={(e) => setValuationInputs({ ...valuationInputs, terminalGrowthRate: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-lg font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-2 block font-medium">추정 기간</label>
                  <div className="relative">
                    <input type="number" value={valuationInputs.projectionYears} onChange={(e) => setValuationInputs({ ...valuationInputs, projectionYears: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-lg font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">년</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 업종 평균 참고 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-slate-900">업종 평균 지표 (건축설계/엔지니어링)</h4>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-slate-500">업종 평균 PER</div>
                  <div className="text-xl font-bold text-slate-900">{INDUSTRY_AVERAGE.per}배</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-slate-500">업종 평균 PBR</div>
                  <div className="text-xl font-bold text-slate-900">{INDUSTRY_AVERAGE.pbr}배</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-slate-500">업종 평균 EV/EBITDA</div>
                  <div className="text-xl font-bold text-slate-900">{INDUSTRY_AVERAGE.evEbitda}배</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-slate-500">업종 평균 ROE</div>
                  <div className="text-xl font-bold text-slate-900">{INDUSTRY_AVERAGE.roe}%</div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">출처: 네이버금융, 2024년 12월 기준 건설/건축 업종 상장사 평균</p>
            </div>

            {/* 동종업계 비교기업 상세 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-semibold text-slate-900">동종업계 비교기업 (유사성 기준 5개사)</h4>
                </div>
                <a 
                  href="https://finance.naver.com/sise/sise_group_detail.naver?type=upjong&no=295" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  네이버금융에서 확인 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 font-semibold text-slate-600">기업명</th>
                      <th className="text-right py-3 px-2 font-semibold text-slate-600">종목코드</th>
                      <th className="text-right py-3 px-2 font-semibold text-slate-600">매출(백만)</th>
                      <th className="text-right py-3 px-2 font-semibold text-slate-600">PER</th>
                      <th className="text-right py-3 px-2 font-semibold text-slate-600">PBR</th>
                      <th className="text-right py-3 px-2 font-semibold text-slate-600">EV/EBITDA</th>
                      <th className="text-right py-3 px-2 font-semibold text-slate-600">ROE</th>
                      <th className="text-right py-3 px-2 font-semibold text-slate-600">OPM</th>
                      <th className="text-center py-3 px-2 font-semibold text-slate-600">출처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PEER_COMPANIES.map((company, idx) => (
                      <tr key={company.ticker} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-slate-50/50' : ''}`}>
                        <td className="py-3 px-2">
                          <a 
                            href={`https://finance.naver.com/item/main.naver?code=${company.ticker}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 hover:underline font-medium flex items-center gap-1"
                          >
                            {company.name}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="text-right py-3 px-2 text-slate-500 font-mono text-xs">{company.ticker}</td>
                        <td className="text-right py-3 px-2 font-medium">{company.revenue.toLocaleString()}</td>
                        <td className="text-right py-3 px-2 font-semibold text-indigo-600">{company.per}배</td>
                        <td className="text-right py-3 px-2 font-semibold text-indigo-600">{company.pbr}배</td>
                        <td className="text-right py-3 px-2 font-semibold text-indigo-600">{company.evEbitda}배</td>
                        <td className="text-right py-3 px-2">{company.roe}%</td>
                        <td className="text-right py-3 px-2">{company.opm}%</td>
                        <td className="text-center py-3 px-2 text-xs text-slate-400">{company.source}</td>
                      </tr>
                    ))}
                    {/* 평균 행 */}
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 font-semibold">
                      <td className="py-3 px-2 text-slate-900">업종 평균</td>
                      <td className="text-right py-3 px-2 text-slate-400">-</td>
                      <td className="text-right py-3 px-2 text-slate-400">-</td>
                      <td className="text-right py-3 px-2 text-blue-700">{INDUSTRY_AVERAGE.per}배</td>
                      <td className="text-right py-3 px-2 text-blue-700">{INDUSTRY_AVERAGE.pbr}배</td>
                      <td className="text-right py-3 px-2 text-blue-700">{INDUSTRY_AVERAGE.evEbitda}배</td>
                      <td className="text-right py-3 px-2 text-blue-700">{INDUSTRY_AVERAGE.roe}%</td>
                      <td className="text-right py-3 px-2 text-blue-700">{INDUSTRY_AVERAGE.opm}%</td>
                      <td className="text-center py-3 px-2 text-xs text-slate-400">5개사 평균</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold mb-1">참고사항</p>
                    <p>상기 비교기업은 건축설계/엔지니어링 업종 내 사업 유사성, 매출 규모, 사업 영역을 기준으로 선정되었습니다. PER/PBR/EV-EBITDA 배수는 네이버금융 기준 최근 실적 기반이며, 실제 가치평가 시 개별 기업의 성장성, 수익성, 리스크 요인을 추가로 고려해야 합니다.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all">이전</button>
              <button onClick={runAnalysis} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all">분석 실행</button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && showResults && valuations && (
          <div className="space-y-8">
            {/* Header with Rating */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    <h2 className="text-3xl font-bold text-slate-900">{financialData.companyName || "기업명"}</h2>
                  </div>
                  <p className="text-slate-500">{financialData.industry} | {financialData.fiscalYear}년 기준 분석</p>
                </div>
                <div className={`px-8 py-4 rounded-2xl border-2 ${ratingBorder} text-center`}>
                  <div className="text-sm text-slate-500 mb-1">투자의견</div>
                  <div className={`text-3xl font-black ${ratingColor} px-4 py-1 rounded-lg inline-block`}>{investmentRating}</div>
                  <div className="text-sm text-slate-600 mt-2">적정가치: <span className="font-bold text-slate-900">{formatBillion(valuations.average)}</span></div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "매출액", value: formatBillion(financialData.revenue), change: ratios.revenueGrowth, formula: `${formatNumber(financialData.priorRevenue)} → ${formatNumber(financialData.revenue)}` },
                { label: "영업이익", value: formatBillion(financialData.operatingIncome), change: ratios.opIncomeGrowth, formula: `OPM ${formatPercent(ratios.opm)}` },
                { label: "당기순이익", value: formatBillion(financialData.netIncome), change: ratios.netIncomeGrowth, formula: `NPM ${formatPercent(ratios.npm)}` },
                { label: "ROE", value: formatPercent(ratios.roe), change: ratios.roe - ratios.priorRoe, formula: `순이익 ${formatNumber(financialData.netIncome)} ÷ 자본 ${formatNumber(financialData.totalEquity)}` },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-500 mb-1">{item.label}</div>
                  <div className="text-2xl font-bold text-slate-900">{item.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {item.change > 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : item.change < 0 ? <ArrowDownRight className="w-4 h-4 text-rose-500" /> : <Minus className="w-4 h-4 text-slate-400" />}
                    <span className={item.change > 0 ? "text-emerald-600 text-sm font-medium" : item.change < 0 ? "text-rose-600 text-sm font-medium" : "text-slate-400 text-sm"}>{item.change > 0 ? "+" : ""}{formatPercent(item.change)} YoY</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">{item.formula}</div>
                </div>
              ))}
            </div>

            {/* 재무비율 분석 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                재무비율 분석
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 수익성 */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 border-b border-slate-200 pb-2">수익성 지표</h4>
                  {[
                    { label: "영업이익률", value: ratios.opm, prior: ratios.priorOpm, avg: INDUSTRY_AVERAGE.opm, formula: `영업이익 ${formatNumber(financialData.operatingIncome)} ÷ 매출 ${formatNumber(financialData.revenue)} × 100` },
                    { label: "순이익률", value: ratios.npm, prior: ratios.priorNpm, avg: INDUSTRY_AVERAGE.npm, formula: `순이익 ${formatNumber(financialData.netIncome)} ÷ 매출 ${formatNumber(financialData.revenue)} × 100` },
                    { label: "ROE", value: ratios.roe, prior: ratios.priorRoe, avg: INDUSTRY_AVERAGE.roe, formula: `순이익 ${formatNumber(financialData.netIncome)} ÷ 자본 ${formatNumber(financialData.totalEquity)} × 100` },
                    { label: "ROA", value: ratios.roa, prior: ratios.priorRoa, avg: 5.0, formula: `순이익 ${formatNumber(financialData.netIncome)} ÷ 자산 ${formatNumber(financialData.totalAssets)} × 100` },
                  ].map((item) => (
                    <div key={item.label} className={`p-4 rounded-xl border ${getStatusBg(item.value, item.avg, item.avg * 0.7)}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        <span className={`text-lg font-bold ${getStatusColor(item.value, item.avg, item.avg * 0.7)}`}>{formatPercent(item.value)}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex justify-between">
                        <span>전기: {formatPercent(item.prior)}</span>
                        <span>업종평균: {formatPercent(item.avg)}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-200">{item.formula}</div>
                    </div>
                  ))}
                </div>

                {/* 안정성 */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 border-b border-slate-200 pb-2">안정성 지표</h4>
                  {[
                    { label: "부채비율", value: ratios.debtRatio, avg: INDUSTRY_AVERAGE.debtRatio, formula: `부채 ${formatNumber(financialData.totalLiabilities)} ÷ 자본 ${formatNumber(financialData.totalEquity)} × 100`, higher: false },
                    { label: "유동비율", value: ratios.currentRatio, avg: INDUSTRY_AVERAGE.currentRatio, formula: `유동자산 ${formatNumber(financialData.currentAssets)} ÷ 유동부채 ${formatNumber(financialData.currentLiabilities)} × 100`, higher: true },
                    { label: "자기자본비율", value: ratios.equityRatio, avg: 50, formula: `자본 ${formatNumber(financialData.totalEquity)} ÷ 자산 ${formatNumber(financialData.totalAssets)} × 100`, higher: true },
                  ].map((item) => (
                    <div key={item.label} className={`p-4 rounded-xl border ${getStatusBg(item.value, item.avg, item.avg * (item.higher ? 0.7 : 1.3), item.higher)}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        <span className={`text-lg font-bold ${getStatusColor(item.value, item.avg, item.avg * (item.higher ? 0.7 : 1.3), item.higher)}`}>{formatPercent(item.value)}</span>
                      </div>
                      <div className="text-xs text-slate-500">업종평균: {formatPercent(item.avg)}</div>
                      <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-200">{item.formula}</div>
                    </div>
                  ))}
                </div>

                {/* 현금흐름 */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 border-b border-slate-200 pb-2">현금흐름</h4>
                  {[
                    { label: "영업활동 CF", value: financialData.operatingCashFlow, prior: financialData.priorOperatingCashFlow },
                    { label: "투자활동 CF", value: financialData.investingCashFlow, prior: financialData.priorInvestingCashFlow },
                    { label: "재무활동 CF", value: financialData.financingCashFlow, prior: financialData.priorFinancingCashFlow },
                  ].map((item) => (
                    <div key={item.label} className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        <span className={`text-lg font-bold ${item.value >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatNumber(item.value)}백만</span>
                      </div>
                      <div className="text-xs text-slate-500">전기: {formatNumber(item.prior)}백만</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 기업가치 평가 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                기업가치 평가
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: "DCF 가치", value: valuations.dcf, formula: `FCF = 순이익 ${formatNumber(financialData.netIncome)} × 1.1 = ${formatNumber(financialData.netIncome * 1.1)}`, detail: `할인율 ${valuationInputs.discountRate}%, 영구성장률 ${valuationInputs.terminalGrowthRate}%` },
                  { label: "PER 적용가치", value: valuations.per, formula: `순이익 ${formatNumber(financialData.netIncome)} × PER ${INDUSTRY_AVERAGE.per}배`, detail: "업종평균 PER 적용" },
                  { label: "PBR 적용가치", value: valuations.pbr, formula: `자본 ${formatNumber(financialData.totalEquity)} × PBR ${INDUSTRY_AVERAGE.pbr}배`, detail: "업종평균 PBR 적용" },
                  { label: "EV/EBITDA 적용가치", value: valuations.evEbitda, formula: `EBITDA ${formatNumber(financialData.operatingIncome * 1.2)} × ${INDUSTRY_AVERAGE.evEbitda}배 - 부채 + 현금`, detail: "EBITDA = 영업이익 × 1.2" },
                ].map((item) => (
                  <div key={item.label} className="p-5 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200">
                    <div className="text-sm text-slate-500 mb-2">{item.label}</div>
                    <div className="text-2xl font-bold text-slate-900 mb-3">{formatBillion(item.value)}</div>
                    <div className="text-xs text-slate-500 space-y-1 border-t border-slate-200 pt-3">
                      <div className="font-medium text-slate-600">산식:</div>
                      <div>{item.formula}</div>
                      <div className="text-slate-400">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">평균 적정가치</span>
                  <span className="text-2xl font-bold text-blue-600">{formatBillion(valuations.average)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-2">(DCF + PER + PBR + EV/EBITDA) ÷ 4 = ({formatNumber(valuations.dcf)} + {formatNumber(valuations.per)} + {formatNumber(valuations.pbr)} + {formatNumber(valuations.evEbitda)}) ÷ 4</div>
              </div>
            </div>

            {/* 동종업계 비교 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                동종업계 비교분석
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 font-semibold text-slate-700 rounded-l-lg">기업명</th>
                      <th className="text-right p-3 font-semibold text-slate-700">매출(백만)</th>
                      <th className="text-right p-3 font-semibold text-slate-700">PER</th>
                      <th className="text-right p-3 font-semibold text-slate-700">PBR</th>
                      <th className="text-right p-3 font-semibold text-slate-700">ROE</th>
                      <th className="text-right p-3 font-semibold text-slate-700">OPM</th>
                      <th className="text-left p-3 font-semibold text-slate-700 rounded-r-lg">출처</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 bg-blue-50">
                      <td className="p-3 font-bold text-blue-700">{financialData.companyName || "대상기업"}</td>
                      <td className="p-3 text-right font-semibold text-blue-700">{formatNumber(financialData.revenue)}</td>
                      <td className="p-3 text-right text-blue-700">{financialData.netIncome > 0 ? (financialData.totalEquity / financialData.netIncome).toFixed(1) : "N/A"}</td>
                      <td className="p-3 text-right text-blue-700">{(financialData.totalEquity / financialData.totalEquity).toFixed(1)}</td>
                      <td className="p-3 text-right text-blue-700">{formatPercent(ratios.roe)}</td>
                      <td className="p-3 text-right text-blue-700">{formatPercent(ratios.opm)}</td>
                      <td className="p-3 text-slate-500">감사보고서</td>
                    </tr>
                    {PEER_COMPANIES.map((peer) => (
                      <tr key={peer.ticker} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3">
                          <a href={`https://finance.naver.com/item/main.nhn?code=${peer.ticker}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-700 hover:text-blue-600">
                            {peer.name}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="p-3 text-right text-slate-600">{formatNumber(peer.revenue)}</td>
                        <td className="p-3 text-right text-slate-600">{peer.per.toFixed(1)}</td>
                        <td className="p-3 text-right text-slate-600">{peer.pbr.toFixed(1)}</td>
                        <td className="p-3 text-right text-slate-600">{peer.roe.toFixed(1)}%</td>
                        <td className="p-3 text-right text-slate-600">{peer.opm.toFixed(1)}%</td>
                        <td className="p-3 text-xs text-slate-400">{peer.source}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-semibold">
                      <td className="p-3 rounded-l-lg">업종 평균</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right">{INDUSTRY_AVERAGE.per.toFixed(1)}</td>
                      <td className="p-3 text-right">{INDUSTRY_AVERAGE.pbr.toFixed(1)}</td>
                      <td className="p-3 text-right">{INDUSTRY_AVERAGE.roe.toFixed(1)}%</td>
                      <td className="p-3 text-right">{INDUSTRY_AVERAGE.opm.toFixed(1)}%</td>
                      <td className="p-3 rounded-r-lg text-xs text-slate-500">가중평균</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3개년 전망 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                3개년 실적 전망
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 font-semibold text-slate-700 rounded-l-lg">구분</th>
                      <th className="text-right p-3 font-semibold text-slate-700">{financialData.fiscalYear}년 (실적)</th>
                      {projections.map((p) => (
                        <th key={p.year} className="text-right p-3 font-semibold text-slate-700">{p.year}년 (E)</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-medium text-slate-700">매출액</td>
                      <td className="p-3 text-right text-slate-900 font-semibold">{formatNumber(financialData.revenue)}</td>
                      {projections.map((p) => (
                        <td key={p.year} className="p-3 text-right text-blue-600">{formatNumber(p.revenue)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-medium text-slate-700">영업이익</td>
                      <td className="p-3 text-right text-slate-900 font-semibold">{formatNumber(financialData.operatingIncome)}</td>
                      {projections.map((p) => (
                        <td key={p.year} className="p-3 text-right text-blue-600">{formatNumber(p.operatingIncome)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-medium text-slate-700">당기순이익</td>
                      <td className="p-3 text-right text-slate-900 font-semibold">{formatNumber(financialData.netIncome)}</td>
                      {projections.map((p) => (
                        <td key={p.year} className="p-3 text-right text-blue-600">{formatNumber(p.netIncome)}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-medium text-slate-700">영업이익률</td>
                      <td className="p-3 text-right text-slate-900 font-semibold">{formatPercent(ratios.opm)}</td>
                      {projections.map((p) => (
                        <td key={p.year} className="p-3 text-right text-blue-600">{formatPercent(p.opm)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-700">성장률</td>
                      <td className="p-3 text-right text-slate-900 font-semibold">{formatPercent(ratios.revenueGrowth)}</td>
                      {projections.map((p) => (
                        <td key={p.year} className="p-3 text-right text-blue-600">{formatPercent(p.growthRate)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-800">전망 가정</div>
                    <ul className="text-xs text-amber-700 mt-1 space-y-1">
                      <li>- 매출 성장률: 당기 성장률({formatPercent(ratios.revenueGrowth)}) 기준, 매년 15%씩 성장률 둔화 가정</li>
                      <li>- 영업이익률: 연평균 2%p 개선 가정 (운영 효율화, 고부가가치 프로젝트 비중 확대)</li>
                      <li>- 순이익: 영업이익의 75% 수준 유지 가정 (법인세율 등 고려)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 애널리스트 의견 */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
              <h3 className="text-xl font-bold mb-6">Investment Thesis</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-blue-200 mb-3">업종 동향</h4>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    건축설계 및 엔지니어링 업종은 친환경 건축, 스마트 빌딩, 도시재생 사업 확대로 중장기 성장 모멘텀이 유효합니다.
                    정부의 SOC 투자 확대와 민간 건설 경기 회복이 예상되어 수주 환경 개선이 기대됩니다.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-200 mb-3">경쟁사 대비 포지셔닝</h4>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    동사는 업종 평균 대비 {ratios.roe > INDUSTRY_AVERAGE.roe ? "높은" : "낮은"} ROE({formatPercent(ratios.roe)} vs {INDUSTRY_AVERAGE.roe}%)와
                    {ratios.opm > INDUSTRY_AVERAGE.opm ? " 우수한" : " 개선이 필요한"} 영업이익률({formatPercent(ratios.opm)} vs {INDUSTRY_AVERAGE.opm}%)을 기록 중입니다.
                  </p>
                </div>
              </div>
              <div className="mt-6 grid md:grid-cols-2 gap-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <h4 className="font-semibold text-emerald-300 mb-2">투자 포인트</h4>
                  <ul className="text-sm text-blue-100 space-y-1">
                    <li>- 안정적인 재무구조 (부채비율 {formatPercent(ratios.debtRatio)})</li>
                    <li>- 양호한 현금흐름 (영업CF {formatNumber(financialData.operatingCashFlow)}백만원)</li>
                    <li>- 적정가치 대비 {valuations.average > financialData.totalEquity ? "저평가" : "적정"} 수준</li>
                  </ul>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <h4 className="font-semibold text-rose-300 mb-2">리스크 요인</h4>
                  <ul className="text-sm text-blue-100 space-y-1">
                    <li>- 건설 경기 변동성에 따른 수주 불확실성</li>
                    <li>- 인건비 상승에 따른 수익성 압박 가능성</li>
                    <li>- 대형 프로젝트 편중 리스크</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => { setStep(3); setShowResults(false); }} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all">변수 수정</button>
              <button onClick={downloadPPT} disabled={isPptLoading} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50">
                <Download className="w-5 h-5" />
                {isPptLoading ? "생성 중..." : "IR 보고서 다운로드"}
              </button>
            </div>
          </div>
        )}
        </>
        )}

        {/* 비교분석 모드 (2개 이상 파일 업로드) */}
        {mode === "compare" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-6 h-6 text-blue-600" />
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">기업 비교분석</h2>
                </div>
                <p className="text-slate-500">
                  {compareLoading ? "업로드한 감사보고서를 분석하는 중입니다..." : `${compareReports.length}개 기업의 감사보고서를 비교한 결과입니다`}
                </p>
              </div>
              <button onClick={resetToUpload} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-all">
                <RotateCcw className="w-4 h-4" />
                새로 업로드
              </button>
            </div>

            {compareLoading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-500">PDF들을 병렬로 분석 중입니다...</p>
              </div>
            )}

            {!compareLoading && compareErrors.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <div className="font-semibold mb-1">일부 파일을 분석하지 못했습니다</div>
                {compareErrors.map((e) => <div key={e}>- {e}</div>)}
              </div>
            )}

            {!compareLoading && compareReports.length === 0 && (
              <div className="text-center py-24 text-slate-500">비교할 수 있는 데이터가 없습니다. 다시 업로드해주세요.</div>
            )}

            {!compareLoading && compareReports.length > 0 && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left p-3 font-semibold text-slate-600">기업명</th>
                          <th className="text-right p-3 font-semibold text-slate-600">회계연도</th>
                          <th className="text-right p-3 font-semibold text-slate-600">매출(백만)</th>
                          <th className="text-right p-3 font-semibold text-slate-600">영업이익(백만)</th>
                          <th className="text-right p-3 font-semibold text-slate-600">순이익(백만)</th>
                          <th className="text-right p-3 font-semibold text-slate-600">OPM</th>
                          <th className="text-right p-3 font-semibold text-slate-600">NPM</th>
                          <th className="text-right p-3 font-semibold text-slate-600">ROE</th>
                          <th className="text-right p-3 font-semibold text-slate-600">ROA</th>
                          <th className="text-right p-3 font-semibold text-slate-600">부채비율</th>
                          <th className="text-right p-3 font-semibold text-slate-600">유동비율</th>
                          <th className="text-right p-3 font-semibold text-slate-600">매출성장률</th>
                          <th className="text-right p-3 font-semibold text-slate-600">적정가치(평균)</th>
                          <th className="text-center p-3 font-semibold text-slate-600">투자의견</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareReports.map((r) => {
                          const ratingColor = r.rating === "BUY" ? "bg-emerald-500 text-white" : r.rating === "HOLD" ? "bg-amber-500 text-white" : "bg-rose-500 text-white";
                          return (
                            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-3 font-medium text-slate-900">{r.data.companyName || r.fileName}</td>
                              <td className="p-3 text-right text-slate-500">{r.data.fiscalYear || "-"}</td>
                              <td className="p-3 text-right">{formatNumber(r.data.revenue)}</td>
                              <td className="p-3 text-right">{formatNumber(r.data.operatingIncome)}</td>
                              <td className="p-3 text-right">{formatNumber(r.data.netIncome)}</td>
                              <td className={`p-3 text-right font-semibold ${highlightClass(r.ratios.opm, compareReports.map((x) => x.ratios.opm))}`}>{formatPercent(r.ratios.opm)}</td>
                              <td className={`p-3 text-right font-semibold ${highlightClass(r.ratios.npm, compareReports.map((x) => x.ratios.npm))}`}>{formatPercent(r.ratios.npm)}</td>
                              <td className={`p-3 text-right font-semibold ${highlightClass(r.ratios.roe, compareReports.map((x) => x.ratios.roe))}`}>{formatPercent(r.ratios.roe)}</td>
                              <td className={`p-3 text-right font-semibold ${highlightClass(r.ratios.roa, compareReports.map((x) => x.ratios.roa))}`}>{formatPercent(r.ratios.roa)}</td>
                              <td className={`p-3 text-right ${highlightClass(r.ratios.debtRatio, compareReports.map((x) => x.ratios.debtRatio), false)}`}>{formatPercent(r.ratios.debtRatio)}</td>
                              <td className={`p-3 text-right ${highlightClass(r.ratios.currentRatio, compareReports.map((x) => x.ratios.currentRatio))}`}>{formatPercent(r.ratios.currentRatio)}</td>
                              <td className="p-3 text-right">{r.ratios.revenueGrowth > 0 ? "+" : ""}{formatPercent(r.ratios.revenueGrowth)}</td>
                              <td className="p-3 text-right font-semibold text-blue-600">{formatBillion(r.valuations.average)}</td>
                              <td className="p-3 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ratingColor}`}>{r.rating}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">매출 · 영업이익 비교 (백만원)</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={compareReports.map((r) => ({ name: r.data.companyName || r.fileName, 매출: r.data.revenue, 영업이익: r.data.operatingIncome }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatNumber(v)} />
                        <Legend />
                        <Bar dataKey="매출" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="영업이익" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">수익성 비교 (%)</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={compareReports.map((r) => ({ name: r.data.companyName || r.fileName, ROE: Number(r.ratios.roe.toFixed(1)), OPM: Number(r.ratios.opm.toFixed(1)) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ROE" fill="#059669" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="OPM" fill="#a7f3d0" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  적정가치는 업종평균 PER/PBR/EV-EBITDA 및 기본 가치평가 변수(할인율 {initialValuationInputs.discountRate}%, 영구성장률 {initialValuationInputs.terminalGrowthRate}%, 추정기간 {initialValuationInputs.projectionYears}년)를 적용한 참고값이며, 단일 기업 분석처럼 변수를 개별 조정할 수는 없습니다.
                </p>
              </>
            )}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
