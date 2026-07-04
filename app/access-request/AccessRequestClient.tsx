"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { BoardItem } from "@/app/api/boards/route";

interface BoardsResponse {
  boards: BoardItem[];
}

interface MyRequest {
  requestedBoardKeys: string[];
  message: string | null;
  status: "pending" | "approved" | "rejected";
  approvedBoardKeys: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface MyRequestResponse {
  request: MyRequest | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_LABEL: Record<MyRequest["status"], string> = {
  pending: "검토 중",
  approved: "승인됨",
  rejected: "거절됨",
};

const STATUS_STYLE: Record<MyRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AccessRequestClient() {
  const { data: boardsData } = useSWR<BoardsResponse>("/api/boards", fetcher);
  const { data: myRequestData, mutate } = useSWR<MyRequestResponse>("/api/access-requests/me", fetcher);

  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const myRequest = myRequestData?.request ?? null;

  useEffect(() => {
    if (myRequest) {
      setSelected(myRequest.requestedBoardKeys);
      setMessage(myRequest.message ?? "");
    }
  }, [myRequestData]);

  function toggle(key: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, key] : current.filter((k) => k !== key)));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitted(false);
    try {
      await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardKeys: selected, message }),
      });
      await mutate();
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-48px)] bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">게시판 이용 신청</h1>
          <p className="mt-2 text-gray-600">
            이용하고 싶은 게시판을 선택해서 신청하면, 관리자가 검토 후 승인해드립니다.
          </p>
        </div>

        {myRequest && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Badge className={STATUS_STYLE[myRequest.status]}>{STATUS_LABEL[myRequest.status]}</Badge>
            <p className="text-sm text-gray-600">
              {myRequest.status === "approved"
                ? `승인된 게시판: ${
                    myRequest.approvedBoardKeys
                      ?.map((key) => boardsData?.boards.find((b) => b.key === key)?.label ?? key)
                      .join(", ") || "없음"
                  }`
                : myRequest.status === "rejected"
                  ? "요청이 거절되었습니다. 아래에서 다시 신청할 수 있습니다."
                  : "관리자가 검토 중입니다. 내용을 수정해서 다시 제출할 수 있습니다."}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {boardsData?.boards.map((board) => (
            <Card key={board.key} className="py-4">
              <CardHeader className="px-5 pb-0">
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={selected.includes(board.key)}
                    onCheckedChange={(checked) => toggle(board.key, checked === true)}
                  />
                  <div>
                    <CardTitle className="text-base">{board.label}</CardTitle>
                    <CardDescription>{board.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pt-3" />
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            요청 메시지 (선택)
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="어떤 업무 때문에 필요한지 간단히 적어주시면 검토에 도움이 됩니다."
            rows={3}
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={submitting || selected.length === 0}>
            {submitting ? "제출 중..." : "요청하기"}
          </Button>
          {submitted && <p className="text-sm text-emerald-600">요청이 접수되었습니다.</p>}
        </div>
      </div>
    </div>
  );
}
