"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MemberItem } from "@/app/api/members/route";
import type { BoardItem } from "@/app/api/boards/route";
import AccessRequestPanel from "./AccessRequestPanel";

interface MembersResponse {
  members: MemberItem[];
  error?: string;
  fetchedAt: string;
}

interface BoardsResponse {
  boards: BoardItem[];
}

interface BoardAccessResponse {
  boardKeys: string[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function BoardAccessDialog({ member, onClose }: { member: MemberItem; onClose: () => void }) {
  const { data: boardsData } = useSWR<BoardsResponse>("/api/boards", fetcher);
  const { data: accessData, isLoading } = useSWR<BoardAccessResponse>(
    `/api/members/${member.id}/board-access`,
    fetcher
  );
  const [selected, setSelected] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const boardKeys = selected ?? accessData?.boardKeys ?? [];
  const isMaster = member.role === "master";

  function toggle(key: string, checked: boolean) {
    const current = selected ?? accessData?.boardKeys ?? [];
    setSelected(checked ? [...current, key] : current.filter((k) => k !== key));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/members/${member.id}/board-access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardKeys }),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member.name || member.email} 게시판 권한</DialogTitle>
          <DialogDescription>
            이 회원이 이용할 수 있는 게시판을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        {isMaster ? (
          <p className="text-sm text-muted-foreground">
            마스터 권한은 모든 게시판에 자동으로 접근할 수 있어 별도 설정이 필요하지 않습니다.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {boardsData?.boards.map((board) => (
              <label key={board.key} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={boardKeys.includes(board.key)}
                  onCheckedChange={(checked) => toggle(board.key, checked === true)}
                />
                {board.label}
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          {!isMaster && (
            <Button onClick={handleSave} disabled={saving || isLoading}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "-";
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

export default function MemberManagementPage() {
  const { data, isLoading } = useSWR<MembersResponse>("/api/members", fetcher, {
    refreshInterval: 60000,
  });
  const [accessTarget, setAccessTarget] = useState<MemberItem | null>(null);

  return (
    <div className="min-h-[calc(100vh-48px)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">회원관리</h1>
          <p className="mt-2 text-muted-foreground">
            구글 OAuth로 로그인한 회원의 기본정보 및 권한 목록입니다
          </p>
          {data && (
            <p className="mt-1 text-sm text-muted-foreground">
              마지막 조회: {formatDateTime(data.fetchedAt)} · 총{" "}
              {data.members?.length ?? 0}명
            </p>
          )}
        </div>

        {data?.error && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/15 px-4 py-3 text-sm text-yellow-400">
            {data.error}
          </div>
        )}

        <AccessRequestPanel />

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent">
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">
                  프로필
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">
                  이름
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">
                  이메일
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-muted-foreground">
                  이메일 인증
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-muted-foreground">
                  권한
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">
                  로케일
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">
                  마지막 로그인
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">
                  가입일
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">
                  Google Sub
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-muted-foreground">
                  게시판 권한
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={10} className="px-4 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-accent" />
                    </td>
                  </tr>
                ))
              ) : data?.members.length ? (
                data.members.map((member) => (
                  <tr key={member.id} className="border-b border-border hover:bg-accent">
                    <td className="px-4 py-3">
                      {member.picture ? (
                        <img
                          src={member.picture}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">
                      {member.name || member.givenName || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">{member.email}</td>
                    <td className="px-4 py-3 text-center">
                      {member.emailVerified ? (
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400">
                          인증됨
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          미인증
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="secondary"
                        className={
                          member.role === "master"
                            ? "bg-purple-500/15 text-purple-400"
                            : member.role === "admin"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {member.role}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {member.locale || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(member.lastLoginAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(member.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                      {member.googleSub}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="outline" size="sm" onClick={() => setAccessTarget(member)}>
                        권한 설정
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    등록된 회원이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {accessTarget && (
        <BoardAccessDialog member={accessTarget} onClose={() => setAccessTarget(null)} />
      )}
    </div>
  );
}
