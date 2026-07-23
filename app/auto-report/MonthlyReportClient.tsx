"use client";

import { useState, useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LineChart,
  ClipboardList,
  BarChart3,
  Upload,
  FileText,
  ImageIcon,
  CheckCircle,
  Loader2,
  AlertCircle,
  Sparkles,
  Download,
  X,
  Presentation,
  FileSpreadsheet,
  FilePen,
  Globe,
  Maximize2,
  Minimize2,
  Wand2,
  Send,
  RotateCcw,
  Type,
  SlidersHorizontal,
} from "lucide-react";

const SIDEBAR_MENUS = [
  { label: "재무분석", href: "/business-analysis", icon: LineChart },
  { label: "월간실적보고", href: "/auto-report", icon: ClipboardList },
  { label: "실적추정", href: "/performance-estimate", icon: SlidersHorizontal },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function rejectionMessage(rejections: FileRejection[]): string {
  const tooLarge = rejections.some((r) => r.errors.some((e) => e.code === "file-too-large"));
  if (tooLarge) return "파일 크기는 최대 50MB까지 지원됩니다.";
  return "지원하지 않는 파일 형식입니다.";
}

export default function MonthlyReportPage() {
  const pathname = usePathname();
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [dataFileBlobUrl, setDataFileBlobUrl] = useState<string | null>(null);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designPreview, setDesignPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataPreview, setDataPreview] = useState<string | null>(null);
  const [dataPreviewTruncated, setDataPreviewTruncated] = useState(false);
  const [isDataPreviewLoading, setIsDataPreviewLoading] = useState(false);
  const [dataPreviewError, setDataPreviewError] = useState<string | null>(null);

  const clearDataFile = () => {
    setDataFile(null);
    setDataFileBlobUrl(null);
    setReportHtml(null);
    setDataPreview(null);
    setDataPreviewError(null);
  };

  const onDropData = useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      setDataPreviewError(rejectionMessage(rejections));
      return;
    }
    const f = acceptedFiles[0];
    if (!f) return;
    setDataFile(f);
    setDataFileBlobUrl(null);
    setReportHtml(null);
    setError(null);
    setDataPreview(null);
    setDataPreviewError(null);
    setIsDataPreviewLoading(true);

    upload(f.name, f, { access: "public", handleUploadUrl: "/api/monthly-report/blob-upload" })
      .then((blob) => {
        setDataFileBlobUrl(blob.url);
        return fetch("/api/monthly-report/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataFileUrl: blob.url, dataFileType: f.type }),
        });
      })
      .then((res) => res.json())
      .then((result) => {
        if (result.error) throw new Error(result.error);
        setDataPreview(result.preview);
        setDataPreviewTruncated(!!result.truncated);
      })
      .catch((err) => {
        setDataPreviewError(err instanceof Error ? err.message : "파일 업로드 또는 미리보기에 실패했습니다.");
      })
      .finally(() => setIsDataPreviewLoading(false));
  }, []);

  const onDropDesign = useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      setError(rejectionMessage(rejections));
      return;
    }
    const f = acceptedFiles[0];
    if (!f) return;
    setDesignFile(f);
    setReportHtml(null);
    setError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setDesignPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setDesignPreview(null);
    }
  }, []);

  const {
    getRootProps: getDataRoot,
    getInputProps: getDataInput,
    isDragActive: isDataDrag,
  } = useDropzone({
    onDrop: onDropData,
    accept: {
      "text/csv": [".csv"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const {
    getRootProps: getDesignRoot,
    getInputProps: getDesignInput,
    isDragActive: isDesignDrag,
  } = useDropzone({
    onDrop: onDropDesign,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const handleGenerate = async () => {
    if (!dataFile || !dataFileBlobUrl) return;
    setIsGenerating(true);
    setError(null);
    setReportHtml(null);
    setHtmlHistory([]);
    try {
      const form = new FormData();
      form.append("dataFileUrl", dataFileBlobUrl);
      form.append("dataFileType", dataFile.type);
      if (designFile) form.append("designFile", designFile);
      const res = await fetch("/api/monthly-report/generate", { method: "POST", body: form });
      const raw = await res.text();
      let result: { html?: string; error?: string };
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error(
          res.status === 504
            ? "보고서 생성이 시간 제한을 초과했습니다. 데이터 파일 크기를 줄이거나, 디자인 샘플 없이 다시 시도해주세요."
            : "서버에서 예상치 못한 응답을 받았습니다. 잠시 후 다시 시도해주세요."
        );
      }
      if (!res.ok || result.error) throw new Error(result.error || "서버 오류");
      setReportHtml(result.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "보고서 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const [isPptLoading, setIsPptLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [designCommand, setDesignCommand] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const [modifyError, setModifyError] = useState<string | null>(null);
  // htmlHistory[0] = 원본, htmlHistory[1] = 1차 수정 전 상태, ...
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [selectedFont, setSelectedFont] = useState<string | null>(null);

  const FONTS = [
    { label: "맑은 고딕", value: "Malgun Gothic", googleFont: null, preview: "가나다" },
    { label: "나눔고딕", value: "Nanum Gothic", googleFont: "Nanum+Gothic:wght@400;700", preview: "가나다" },
    { label: "나눔명조", value: "Nanum Myeongjo", googleFont: "Nanum+Myeongjo:wght@400;700", preview: "가나다" },
    { label: "Noto Sans", value: "Noto Sans KR", googleFont: "Noto+Sans+KR:wght@400;500;700", preview: "가나다" },
    { label: "Noto Serif", value: "Noto Serif KR", googleFont: "Noto+Serif+KR:wght@400;700", preview: "가나다" },
    { label: "Gothic A1", value: "Gothic A1", googleFont: "Gothic+A1:wght@400;700", preview: "가나다" },
  ];

  const QUICK_COMMANDS = [
    "다크 모드로 변경",
    "밝고 깔끔한 화이트 배경으로 변경",
    "폰트 크기를 전체적으로 크게",
    "파란색 계열 테마로 변경",
    "초록색 계열 테마로 변경",
    "표 스타일을 더 심플하게",
  ];

  const handleModify = async (command?: string) => {
    const cmd = command ?? designCommand;
    if (!reportHtml || !cmd.trim() || isModifying) return;
    setIsModifying(true);
    setModifyError(null);
    try {
      const res = await fetch("/api/monthly-report/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: reportHtml, command: cmd }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "서버 오류");
      setHtmlHistory((prev) => [...prev, reportHtml]);
      setReportHtml(result.html);
      setDesignCommand("");
    } catch (err) {
      setModifyError(err instanceof Error ? err.message : "디자인 수정 중 오류가 발생했습니다.");
    } finally {
      setIsModifying(false);
    }
  };

  // steps: 몇 단계 전으로 되돌릴지 (1 = 바로 이전, htmlHistory.length = 원본)
  const handleUndo = (steps: number) => {
    if (steps < 1 || steps > htmlHistory.length) return;
    const targetIndex = htmlHistory.length - steps;
    setReportHtml(htmlHistory[targetIndex]);
    setHtmlHistory((prev) => prev.slice(0, targetIndex));
    setSelectedFont(null);
  };

  const applyFont = (font: typeof FONTS[number]) => {
    if (!reportHtml) return;
    setHtmlHistory((prev) => [...prev, reportHtml]);

    // 기존 font-override 블록 제거
    let html = reportHtml.replace(
      /<!-- font-override -->[\s\S]*?<!-- \/font-override -->/g,
      ""
    );

    const linkTag = font.googleFont
      ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=${font.googleFont}&display=swap" rel="stylesheet">`
      : "";

    const inject = `<!-- font-override -->
${linkTag}
<style>
  * { font-family: '${font.value}', 'Malgun Gothic', sans-serif !important; }
</style>
<!-- /font-override -->`;

    html = html.includes("</head>")
      ? html.replace("</head>", `${inject}\n</head>`)
      : inject + html;

    setReportHtml(html);
    setSelectedFont(font.value);
  };

  const downloadHtml = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "월간실적보고서.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (!reportHtml) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(reportHtml, "text/html");
    const tables = Array.from(doc.querySelectorAll("table"));
    const lines: string[] = [];

    if (tables.length === 0) {
      // No tables: dump text
      const text = doc.body.innerText || doc.body.textContent || "";
      const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "월간실적보고서.csv";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    tables.forEach((table) => {
      const prev = table.previousElementSibling;
      if (prev?.textContent?.trim()) lines.push(`"${prev.textContent.trim()}"`);
      Array.from(table.querySelectorAll("tr")).forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th,td")).map(
          (td) => `"${(td.textContent || "").trim().replace(/"/g, '""')}"`
        );
        lines.push(cells.join(","));
      });
      lines.push("");
    });

    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "월간실적보고서.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadWord = () => {
    if (!reportHtml) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(reportHtml, "text/html");
    const body = doc.body.innerHTML;
    const word = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name=ProgId content=Word.Document>
<title>월간실적보고서</title>
<style>
  body{font-family:'Malgun Gothic',sans-serif;margin:2cm;font-size:11pt;}
  table{border-collapse:collapse;width:100%;margin-bottom:12pt;}
  th,td{border:1pt solid #cbd5e1;padding:5pt 8pt;font-size:10pt;}
  th{background:#1e3a5f;color:#fff;}
  tr:nth-child(even) td{background:#f8fafc;}
  h1,h2,h3{color:#1e3a5f;}
</style>
</head>
<body>${body}</body>
</html>`;
    const blob = new Blob(["﻿", word], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "월간실적보고서.doc";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPpt = async () => {
    if (!reportHtml || isPptLoading) return;
    setIsPptLoading(true);
    try {
      const res = await fetch("/api/monthly-report/export/ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: reportHtml }),
      });
      if (!res.ok) throw new Error("PPT 생성 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "월간실적보고서.pptx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PPT 다운로드 실패");
    } finally {
      setIsPptLoading(false);
    }
  };

  const canGenerate = !!dataFile && !!dataFileBlobUrl && !isGenerating;


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Financial Analysis</h1>
            <p className="text-xs text-slate-500">Investment Research Report</p>
          </div>
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

        <main className="flex-1 px-8 py-8 max-w-5xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">월간실적보고</h2>
            <p className="text-slate-500 mt-1">
              실적 데이터 파일만 업로드해도 AI가 보고서를 자동 생성합니다. 디자인 샘플을 함께 올리면 해당 스타일로 맞춤 제작됩니다.
            </p>
          </div>

          {/* Upload Section */}
          <div className="grid grid-cols-2 gap-5 mb-6">
            {/* Data File */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-800">실적 데이터 파일</span>
                <span className="ml-auto text-xs text-slate-400">CSV · Excel · PDF · TXT (최대 50MB)</span>
              </div>
              <div
                {...getDataRoot()}
                className={`p-8 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[200px] ${
                  isDataDrag
                    ? "bg-blue-50"
                    : dataFile
                    ? "bg-emerald-50"
                    : "hover:bg-slate-50"
                }`}
              >
                <input {...getDataInput()} />
                {dataFile ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                    <p className="text-sm font-semibold text-slate-800 text-center break-all px-2">{dataFile.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(dataFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDataFile();
                      }}
                      className="mt-3 flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700"
                    >
                      <X className="w-3 h-3" />삭제
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">클릭하거나 파일을 드래그하세요</p>
                    <p className="text-xs text-slate-400 mt-1">월별 매출, 영업이익 등 실적 데이터</p>
                  </>
                )}
              </div>
            </div>

            {/* Design Sample */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-slate-800">보고서 디자인 샘플</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">선택</span>
                <span className="ml-auto text-xs text-slate-400">PNG · JPG · PDF</span>
              </div>
              <div
                {...getDesignRoot()}
                className={`p-8 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[200px] ${
                  isDesignDrag
                    ? "bg-violet-50"
                    : designFile
                    ? "bg-emerald-50"
                    : "hover:bg-slate-50"
                }`}
              >
                <input {...getDesignInput()} />
                {designFile ? (
                  designPreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={designPreview}
                        alt="디자인 샘플 미리보기"
                        className="max-h-36 rounded-lg object-contain border border-slate-200 shadow-sm mb-2"
                      />
                      <p className="text-xs text-slate-500 truncate max-w-[180px]">{designFile.name}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDesignFile(null); setDesignPreview(null); setReportHtml(null); }}
                        className="mt-2 flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700"
                      >
                        <X className="w-3 h-3" />삭제
                      </button>
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                      <p className="text-sm font-semibold text-slate-800 text-center break-all px-2">{designFile.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{(designFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDesignFile(null); setReportHtml(null); }}
                        className="mt-3 flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700"
                      >
                        <X className="w-3 h-3" />삭제
                      </button>
                    </>
                  )
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
                      <ImageIcon className="w-6 h-6 text-violet-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">클릭하거나 파일을 드래그하세요</p>
                    <p className="text-xs text-slate-400 mt-1">참고할 보고서 디자인 이미지</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Data File Content Preview */}
          {dataFile && (
            <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-800">업로드한 데이터 미리보기</span>
                {dataPreviewTruncated && (
                  <span className="ml-auto text-xs text-slate-400">일부만 표시됨</span>
                )}
              </div>
              <div className="p-5">
                {isDataPreviewLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    파일 내용을 불러오는 중...
                  </div>
                )}
                {dataPreviewError && (
                  <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{dataPreviewError}</span>
                  </div>
                )}
                {!isDataPreviewLoading && dataPreview && (
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-600 leading-relaxed">
                    {dataPreview}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* How it works hint */}
          {dataFile && !designFile && (
            <div className="mb-6 p-4 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700 flex gap-3">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                디자인 샘플 없이 생성합니다. AI가 네이비·블루 계열의 전문 보고서 레이아웃을 자체적으로 디자인합니다.
                원하는 스타일이 있다면 디자인 샘플을 업로드하세요.
              </span>
            </div>
          )}
          {!dataFile && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex gap-3">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                실적 데이터 파일(CSV, Excel, PDF)을 업로드하면 AI가 보고서를 자동 생성합니다.
                디자인 샘플도 함께 올리면 해당 스타일로 맞춤 제작됩니다.
              </span>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center gap-3 px-10 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI 보고서 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  AI 보고서 생성
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm mb-6">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Report Preview + Design Editor */}
          {reportHtml && (
            <div className="space-y-4">
              {/* Preview Card */}
              <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}>
                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-2 mr-auto">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-900">보고서 미리보기</span>
                  </div>

                  <button
                    onClick={() => setIsFullscreen((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    {isFullscreen ? "축소" : "전체화면"}
                  </button>

                  <div className="w-px h-5 bg-slate-200" />

                  {/* PPT */}
                  <button
                    onClick={downloadPpt}
                    disabled={isPptLoading}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isPptLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
                    PPT
                  </button>
                  <button
                    onClick={downloadExcel}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Excel
                  </button>
                  <button
                    onClick={downloadWord}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <FilePen className="w-3.5 h-3.5" />
                    Word
                  </button>
                  <button
                    onClick={downloadHtml}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    HTML
                  </button>
                </div>

                <iframe
                  srcDoc={reportHtml}
                  className="w-full border-0"
                  style={{ minHeight: isFullscreen ? "calc(100vh - 65px)" : "900px" }}
                  title="생성된 월간실적보고서"
                />
              </div>

              {/* Design Command Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-semibold text-slate-900">디자인 수정</span>
                  <span className="text-xs text-slate-400 ml-1">— 원하는 방향을 명령어로 입력하세요</span>
                  {htmlHistory.length > 0 && (
                    <span className="ml-auto text-xs text-slate-400">{htmlHistory.length}단계 수정됨</span>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {/* Quick Commands */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">빠른 명령</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_COMMANDS.map((cmd) => (
                        <button
                          key={cmd}
                          onClick={() => handleModify(cmd)}
                          disabled={isModifying}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-violet-100 hover:text-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Selector */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" />글꼴
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {FONTS.map((font) => {
                        const isActive = selectedFont === font.value;
                        return (
                          <button
                            key={font.value}
                            onClick={() => applyFont(font)}
                            disabled={isModifying}
                            title={font.value}
                            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              isActive
                                ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                            }`}
                          >
                            <span className="text-base leading-tight" style={{ fontFamily: font.value }}>
                              가나다
                            </span>
                            <span>{font.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Free-form Input */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">직접 입력</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={designCommand}
                        onChange={(e) => setDesignCommand(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleModify(); } }}
                        placeholder="예: 헤더 색상을 남색으로 변경, 표를 더 컴팩트하게, 전체 폰트를 고딕으로..."
                        disabled={isModifying}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition-all"
                      />
                      <button
                        onClick={() => handleModify()}
                        disabled={!designCommand.trim() || isModifying}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isModifying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {isModifying ? "수정 중..." : "적용"}
                      </button>
                    </div>
                  </div>

                  {/* Undo History */}
                  {htmlHistory.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">되돌리기</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: htmlHistory.length }, (_, i) => {
                          const steps = i + 1;
                          const isOriginal = steps === htmlHistory.length;
                          return (
                            <button
                              key={steps}
                              onClick={() => handleUndo(steps)}
                              disabled={isModifying}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                isOriginal
                                  ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                                  : "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                              }`}
                            >
                              <RotateCcw className="w-3 h-3" />
                              {isOriginal ? `원본 (${steps}단계 전)` : `${steps}단계 전`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Modify Error */}
                  {modifyError && (
                    <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{modifyError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
