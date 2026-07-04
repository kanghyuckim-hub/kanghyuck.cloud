"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { BoardItem } from "@/app/api/boards/route";
import type { AccessRequestItem } from "@/app/api/access-requests/route";

interface BoardsResponse {
  boards: BoardItem[];
}

interface AccessRequestsResponse {
  requests: AccessRequestItem[];
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_LABEL: Record<string, string> = {
  pending: "검토 중",
  approved: "승인됨",
  rejected: "거절됨",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RequestRow({ request, boards }: { request: AccessRequestItem; boards: BoardItem[] }) {
  const [selected, setSelected] = useState<string[]>(request.requestedBoardKeys);
  const [busy, setBusy] = useState(false);
  const { mutate } = useSWR<AccessRequestsResponse>("/api/access-requests", fetcher);

  function toggle(key: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, key] : current.filter((k) => k !== key)));
  }

  async function review(action: "approve" | "reject") {
    setBusy(true);
    try {
      await fetch(`/api/access-requests/${request.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, boardKeys: selected }),
      });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  const boardLabel = (key: string) => boards.find((b) => b.key === key)?.label ?? key;

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{request.name || request.email}</p>
          <p className="text-sm text-gray-500">{request.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_STYLE[request.status]}>{STATUS_LABEL[request.status]}</Badge>
          <span className="text-xs text-gray-400">{formatDateTime(request.updatedAt)}</span>
        </div>
      </div>

      {request.message && (
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          "{request.message}"
        </p>
      )}

      {request.status === "pending" ? (
        <>
          <p className="mt-3 mb-1 text-xs font-medium text-gray-500">요청한 게시판 (승인 전 조정 가능)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {boards.map((board) => (
              <label key={board.key} className="flex items-center gap-2 text-sm text-gray-700">
                <Checkbox
                  checked={selected.includes(board.key)}
                  onCheckedChange={(checked) => toggle(board.key, checked === true)}
                />
                {board.label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => review("approve")} disabled={busy}>
              승인
            </Button>
            <Button size="sm" variant="outline" onClick={() => review("reject")} disabled={busy}>
              거절
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-600">
          요청: {request.requestedBoardKeys.map(boardLabel).join(", ") || "없음"}
          {request.status === "approved" && (
            <> · 승인됨: {request.approvedBoardKeys?.map(boardLabel).join(", ") || "없음"}</>
          )}
        </p>
      )}
    </div>
  );
}

export default function AccessRequestPanel() {
  const { data: boardsData } = useSWR<BoardsResponse>("/api/boards", fetcher);
  const { data, isLoading } = useSWR<AccessRequestsResponse>("/api/access-requests", fetcher);

  if (data?.error) return null;
  if (!isLoading && data?.requests.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-xl font-semibold text-gray-900">게시판 이용 신청 관리</h2>
      <div className="space-y-3">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ) : (
          data?.requests.map((request) => (
            <RequestRow key={request.userId} request={request} boards={boardsData?.boards ?? []} />
          ))
        )}
      </div>
    </div>
  );
}
