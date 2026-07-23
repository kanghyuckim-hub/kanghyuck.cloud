"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { upload } from "@vercel/blob/client";
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
  CheckCircle,
  LineChart,
  ClipboardList,
  SlidersHorizontal,
  RotateCcw,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertCircle,
} from "lucide-react";

const SIDEBAR_MENUS = [
  { label: "재무분석", href: "/business-analysis", icon: LineChart },
  { label: "월간실적보고", href: "/auto-report", icon: ClipboardList },
  { label: "실적추정", href: "/performance-estimate", icon: SlidersHorizontal },
];

interface ProjectRecord {
  organization: string;
  projectName: string;
  contractAmount: number;
  totalEstimatedCost: number;
  actualCostIncurred: number;
  plannedDurationDays: number;
}

interface Adjustment {
  scheduleDelayDays: number;
  costChangePercent: number;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// 총예정원가 중 일정(기간)에 비례하는 비중 가정치 — 일정이 지연되면 이 비중만큼 총예정원가가 늘어난다고 가정
const OVERHEAD_TIME_COST_RATIO = 0.15;

function computeProjectResult(project: ProjectRecord, adj: Adjustment) {
  const adjustedActualCost = project.actualCostIncurred * (1 + adj.costChangePercent / 100);
  const scheduleDelayRatio = project.plannedDurationDays > 0 ? adj.scheduleDelayDays / project.plannedDurationDays : 0;
  const adjustedTotalEstimatedCost = project.totalEstimatedCost * (1 + scheduleDelayRatio * OVERHEAD_TIME_COST_RATIO);

  const origProgress = project.totalEstimatedCost > 0 ? Math.min(project.actualCostIncurred / project.totalEstimatedCost, 1) : 0;
  const adjProgress = adjustedTotalEstimatedCost > 0 ? Math.min(Math.max(adjustedActualCost / adjustedTotalEstimatedCost, 0), 1) : 0;

  const origRevenue = project.contractAmount * origProgress;
  const adjRevenue = project.contractAmount * adjProgress;

  return {
    adjustedActualCost,
    adjustedTotalEstimatedCost,
    origProgress,
    adjProgress,
    origRevenue,
    adjRevenue,
    delta: adjRevenue - origRevenue,
  };
}

export default function PerformanceEstimateClient() {
  const pathname = usePathname();

  const [phase, setPhase] = useState<"upload" | "select" | "report">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [unit, setUnit] = useState("원");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adjustments, setAdjustments] = useState<Record<number, Adjustment>>({});

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsLoading(true);
    setLoadError("");
    try {
      const blob = await upload(uploadedFile.name, uploadedFile, {
        access: "public",
        handleUploadUrl: "/api/performance-estimate/blob-upload",
      });
      const response = await fetch("/api/performance-estimate/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataFileUrl: blob.url }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "파일 분석에 실패했습니다.");

      setUnit(result.unit || "원");
      setProjects(result.projects);
      setSelected(new Set());
      setAdjustments({});
      setPhase("select");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "파일 분석에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  const toggleSelected = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const goToAdjust = () => {
    setAdjustments((prev) => {
      const next = { ...prev };
      selected.forEach((idx) => {
        if (!next[idx]) next[idx] = { scheduleDelayDays: 0, costChangePercent: 0 };
      });
      return next;
    });
    setPhase("report");
  };

  const updateAdjustment = (idx: number, field: keyof Adjustment, value: number) => {
    setAdjustments((prev) => ({
      ...prev,
      [idx]: { ...(prev[idx] ?? { scheduleDelayDays: 0, costChangePercent: 0 }), [field]: value },
    }));
  };

  const reset = () => {
    setPhase("upload");
    setFile(null);
    setProjects([]);
    setSelected(new Set());
    setAdjustments({});
    setLoadError("");
  };

  const formatAmount = (num: number) => `${new Intl.NumberFormat("ko-KR").format(Math.round(num))}${unit}`;
  const formatPercent = (num: number) => (isNaN(num) || !isFinite(num) ? "0.0" : (num * 100).toFixed(1)) + "%";

  const selectedResults = useMemo(() => {
    return Array.from(selected).map((idx) => {
      const project = projects[idx];
      const adj = adjustments[idx] ?? { scheduleDelayDays: 0, costChangePercent: 0 };
      return { idx, project, adj, result: computeProjectResult(project, adj) };
    });
  }, [selected, adjustments, projects]);

  const orgSummary = useMemo(() => {
    const map = new Map<string, { orig: number; adj: number; count: number }>();
    for (const { project, result } of selectedResults) {
      const cur = map.get(project.organization) ?? { orig: 0, adj: 0, count: 0 };
      cur.orig += result.origRevenue;
      cur.adj += result.adjRevenue;
      cur.count += 1;
      map.set(project.organization, cur);
    }
    return Array.from(map.entries()).map(([organization, v]) => ({
      organization,
      ...v,
      delta: v.adj - v.orig,
    }));
  }, [selectedResults]);

  const totalOrig = selectedResults.reduce((s, r) => s + r.result.origRevenue, 0);
  const totalAdj = selectedResults.reduce((s, r) => s + r.result.adjRevenue, 0);
  const totalDelta = totalAdj - totalOrig;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">실적추정</h1>
            <p className="text-xs text-slate-500">진행율매출 변동 시뮬레이션</p>
          </div>
        </div>
      </header>

      <div className="flex">
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
                      isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
          {phase === "upload" && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">실적파일 업로드</h2>
                <p className="text-slate-500 text-lg">
                  건축설계업 진행율매출 계산에 필요한 프로젝트별 실적 파일(조직, 계약금액, 총예정원가, 실투입원가 등)을 업로드하세요
                </p>
              </div>
              <div {...getRootProps()} className={`relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all overflow-hidden ${isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-400 bg-white shadow-sm"}`}>
                <input {...getInputProps()} />
                <div className="relative z-10">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center">
                    {isLoading ? <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> : <Upload className="w-8 h-8 text-blue-600" />}
                  </div>
                  <p className="text-xl text-slate-900 mb-2 font-medium">{isLoading ? "AI가 프로젝트 데이터를 분석 중..." : isDragActive ? "파일을 놓으세요" : "클릭하거나 파일을 드래그하세요"}</p>
                  <p className="text-sm text-slate-400">CSV · Excel · PDF · TXT (최대 50MB) — 컬럼 형식은 자유롭게, AI가 자동으로 인식합니다</p>
                </div>
              </div>
              {file && !isLoading && (
                <div className="mt-6 flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
              )}
              {loadError && (
                <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{loadError}</div>
              )}
            </div>
          )}

          {phase === "select" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">프로젝트 선택</h2>
                  <p className="text-slate-500 mt-2">실적추정 시뮬레이션에 포함할 프로젝트를 선택하세요 ({selected.size}개 선택됨)</p>
                </div>
                <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-all">
                  <RotateCcw className="w-4 h-4" />
                  다시 업로드
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 w-10"></th>
                        <th className="text-left p-3 font-semibold text-slate-600">조직</th>
                        <th className="text-left p-3 font-semibold text-slate-600">프로젝트명</th>
                        <th className="text-right p-3 font-semibold text-slate-600">계약금액</th>
                        <th className="text-right p-3 font-semibold text-slate-600">총예정원가</th>
                        <th className="text-right p-3 font-semibold text-slate-600">실투입원가</th>
                        <th className="text-right p-3 font-semibold text-slate-600">진행율</th>
                        <th className="text-right p-3 font-semibold text-slate-600">진행율매출</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p, idx) => {
                        const progress = p.totalEstimatedCost > 0 ? Math.min(p.actualCostIncurred / p.totalEstimatedCost, 1) : 0;
                        const revenue = p.contractAmount * progress;
                        return (
                          <tr key={idx} onClick={() => toggleSelected(idx)} className={`border-b border-slate-100 cursor-pointer transition-colors ${selected.has(idx) ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                            <td className="p-3 text-center">
                              <input type="checkbox" checked={selected.has(idx)} onChange={() => toggleSelected(idx)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-blue-600" />
                            </td>
                            <td className="p-3 text-slate-700">{p.organization}</td>
                            <td className="p-3 font-medium text-slate-900">{p.projectName}</td>
                            <td className="p-3 text-right">{formatAmount(p.contractAmount)}</td>
                            <td className="p-3 text-right">{formatAmount(p.totalEstimatedCost)}</td>
                            <td className="p-3 text-right">{formatAmount(p.actualCostIncurred)}</td>
                            <td className="p-3 text-right font-semibold text-blue-600">{formatPercent(progress)}</td>
                            <td className="p-3 text-right font-semibold text-slate-900">{formatAmount(revenue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={goToAdjust}
                  disabled={selected.size === 0}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  선택한 {selected.size}개 프로젝트로 시뮬레이션
                </button>
              </div>
            </div>
          )}

          {phase === "report" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">실적추정 시뮬레이션</h2>
                  <p className="text-slate-500 mt-2">각 프로젝트의 일정·실투입원가 변동값을 입력하면 아래 결과가 실시간으로 반영됩니다</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPhase("select")} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-all">
                    프로젝트 다시 선택
                  </button>
                  <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-all">
                    <RotateCcw className="w-4 h-4" />
                    새로 업로드
                  </button>
                </div>
              </div>

              {/* 변동값 입력 */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left p-3 font-semibold text-slate-600">프로젝트</th>
                        <th className="text-right p-3 font-semibold text-slate-600 w-40">일정 변동 (일)</th>
                        <th className="text-right p-3 font-semibold text-slate-600 w-44">실투입원가 변동률 (%)</th>
                        <th className="text-right p-3 font-semibold text-slate-600">진행율 (원본→조정)</th>
                        <th className="text-right p-3 font-semibold text-slate-600">진행율매출 (원본→조정)</th>
                        <th className="text-right p-3 font-semibold text-slate-600">증감</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedResults.map(({ idx, project, adj, result }) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="p-3">
                            <div className="font-medium text-slate-900">{project.projectName}</div>
                            <div className="text-xs text-slate-400">{project.organization}</div>
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              value={adj.scheduleDelayDays}
                              onChange={(e) => updateAdjustment(idx, "scheduleDelayDays", Number(e.target.value))}
                              className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-right text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              value={adj.costChangePercent}
                              onChange={(e) => updateAdjustment(idx, "costChangePercent", Number(e.target.value))}
                              className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-right text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatPercent(result.origProgress)} → <span className="font-semibold text-slate-900">{formatPercent(result.adjProgress)}</span>
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatAmount(result.origRevenue)} → <span className="font-semibold text-slate-900">{formatAmount(result.adjRevenue)}</span>
                          </td>
                          <td className={`p-3 text-right font-semibold ${result.delta > 0 ? "text-emerald-600" : result.delta < 0 ? "text-rose-600" : "text-slate-400"}`}>
                            <div className="flex items-center justify-end gap-1">
                              {result.delta > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : result.delta < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                              {formatAmount(Math.abs(result.delta))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 전체 요약 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-500 mb-1">원본 진행율매출 합계</div>
                  <div className="text-2xl font-bold text-slate-900">{formatAmount(totalOrig)}</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-500 mb-1">조정 진행율매출 합계</div>
                  <div className="text-2xl font-bold text-blue-600">{formatAmount(totalAdj)}</div>
                </div>
                <div className={`rounded-xl p-5 border shadow-sm ${totalDelta >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                  <div className="text-sm text-slate-500 mb-1">전체 증감</div>
                  <div className={`text-2xl font-bold ${totalDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {totalDelta >= 0 ? "+" : ""}{formatAmount(totalDelta)}
                  </div>
                </div>
              </div>

              {/* 조직별 집계 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  조직별 실적추정 변동
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left p-3 font-semibold text-slate-600 rounded-l-lg">조직</th>
                          <th className="text-right p-3 font-semibold text-slate-600">프로젝트수</th>
                          <th className="text-right p-3 font-semibold text-slate-600">원본</th>
                          <th className="text-right p-3 font-semibold text-slate-600">조정</th>
                          <th className="text-right p-3 font-semibold text-slate-600 rounded-r-lg">증감</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orgSummary.map((o) => (
                          <tr key={o.organization} className="border-b border-slate-100">
                            <td className="p-3 font-medium text-slate-900">{o.organization}</td>
                            <td className="p-3 text-right text-slate-500">{o.count}</td>
                            <td className="p-3 text-right">{formatAmount(o.orig)}</td>
                            <td className="p-3 text-right font-semibold text-blue-600">{formatAmount(o.adj)}</td>
                            <td className={`p-3 text-right font-semibold ${o.delta > 0 ? "text-emerald-600" : o.delta < 0 ? "text-rose-600" : "text-slate-400"}`}>
                              {o.delta > 0 ? "+" : ""}{formatAmount(o.delta)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={orgSummary.map((o) => ({ name: o.organization, 원본: Math.round(o.orig), 조정: Math.round(o.adj) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatAmount(v)} />
                      <Legend />
                      <Bar dataKey="원본" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="조정" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold mb-1">계산 방식</p>
                    <p>진행율 = 실투입원가 ÷ 총예정원가 (원가 기준). 일정이 지연되면 총예정원가 중 시간에 비례하는 비중({(OVERHEAD_TIME_COST_RATIO * 100).toFixed(0)}%로 가정)만큼 총예정원가가 늘어난다고 가정해 진행율에 간접 반영합니다. 진행율매출 = 계약금액 × 진행율.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
