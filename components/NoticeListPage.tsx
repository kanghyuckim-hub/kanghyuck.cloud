"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PenSquare,
  Search,
  User,
  Calendar,
  Trash2,
  Inbox,
  X,
  Paperclip,
  FileText,
  Download,
  Eye,
} from "lucide-react";

// 첨부파일 타입 정의
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

// 공지사항 타입 정의
export interface Notice {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  isPinned: boolean;
  category: "공지" | "업무" | "기타";
  attachments?: Attachment[];
}

// 샘플 더미 데이터
const initialNotices: Notice[] = [
  {
    id: "1",
    title: "5월 정기 회의 일정 안내",
    content:
      "안녕하세요, 5월 정기 회의는 5월 15일 오후 2시에 진행됩니다. 모든 팀원분들의 참석 부탁드립니다. 회의 안건은 추후 공유 예정입니다.",
    author: "김팀장",
    createdAt: "2024-05-10T09:00:00Z",
    isPinned: true,
    category: "공지",
  },
  {
    id: "2",
    title: "신규 프로젝트 킥오프 미팅",
    content:
      "새로운 클라이언트 프로젝트가 시작됩니다. 킥오프 미팅에서 프로젝트 개요와 역할 분담에 대해 논의할 예정입니다. 관련 자료는 미리 검토 부탁드립니다.",
    author: "박매니저",
    createdAt: "2024-05-08T14:30:00Z",
    isPinned: false,
    category: "업무",
  },
  {
    id: "3",
    title: "사내 복지 혜택 변경 안내",
    content:
      "6월부터 사내 복지 혜택이 일부 변경됩니다. 점심 식대 지원금이 인상되며, 새로운 자기계발 지원 프로그램이 추가됩니다. 자세한 내용은 첨부 파일을 확인해주세요.",
    author: "인사팀",
    createdAt: "2024-05-07T11:00:00Z",
    isPinned: true,
    category: "공지",
    attachments: [
      {
        id: "att1",
        name: "2024년_복지혜택_안내서.pdf",
        size: 2048000,
        type: "application/pdf",
        url: "/sample.pdf",
      },
      {
        id: "att2",
        name: "자기계발_지원_신청서.pdf",
        size: 512000,
        type: "application/pdf",
        url: "/sample2.pdf",
      },
    ],
  },
  {
    id: "4",
    title: "개발팀 코드 리뷰 가이드라인",
    content:
      "효율적인 코드 리뷰를 위한 새로운 가이드라인을 공유드립니다. PR 작성 시 체크리스트와 리뷰어 지정 규칙을 참고해주세요.",
    author: "이개발",
    createdAt: "2024-05-05T16:20:00Z",
    isPinned: false,
    category: "업무",
  },
  {
    id: "5",
    title: "사무실 청소 당번 안내",
    content:
      "이번 주 사무실 청소 당번은 기획팀입니다. 금요일 퇴근 전 정리정돈 부탁드립니다. 다음 주 당번은 개발팀입니다.",
    author: "총무팀",
    createdAt: "2024-05-03T09:15:00Z",
    isPinned: false,
    category: "기타",
  },
];

// 카테고리 목록
const categories = ["전체", "공지", "업무", "기타"] as const;

// 카테고리별 Badge 색상
const categoryColors: Record<string, string> = {
  공지: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  업무: "bg-green-100 text-green-700 hover:bg-green-100",
  기타: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

// 날짜 포맷 함수 (YYYY.MM.DD)
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

// 본문 미리보기 (80자 제한)
function truncateContent(content: string, maxLength: number = 80): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + "...";
}

interface NoticeListPageProps {
  notices?: Notice[];
  onDelete?: (id: string) => void;
  onNavigate?: (page: string, id?: string) => void;
}

export default function NoticeListPage({
  notices: propNotices,
  onDelete,
  onNavigate,
}: NoticeListPageProps) {
  // 내부 fallback state (props 없이도 동작)
  const [internalNotices, setInternalNotices] =
    useState<Notice[]>(initialNotices);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");

  // 새 공지 작성 모달 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: "",
    content: "",
    category: "공지" as "공지" | "업무" | "기타",
    isPinned: false,
    attachments: [] as Attachment[],
  });

  // 상세보기 모달 상태
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // props가 있으면 props 사용, 없으면 내부 state 사용
  const notices = propNotices ?? internalNotices;

  // 삭제 핸들러
  const handleDelete = (id: string) => {
    if (onDelete) {
      onDelete(id);
    } else {
      setInternalNotices((prev) => prev.filter((notice) => notice.id !== id));
    }
  };

  // 네비게이션 핸들러
  const handleNavigate = (page: string, id?: string) => {
    if (onNavigate) {
      onNavigate(page, id);
    } else {
      console.log(`Navigate to ${page}`, id ? `with id: ${id}` : "");
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }));

    setNewNotice((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments],
    }));
  };

  // 첨부파일 제거 핸들러
  const handleRemoveAttachment = (attachmentId: string) => {
    setNewNotice((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((att) => att.id !== attachmentId),
    }));
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 상세보기 열기
  const handleOpenDetail = (notice: Notice) => {
    console.log("[v0] Opening detail for notice:", notice);
    console.log("[v0] Attachments:", notice.attachments);
    setSelectedNotice(notice);
    setPreviewAttachment(null);
    setIsDetailOpen(true);
  };

  // 새 공지 작성 핸들러
  const handleSubmitNotice = () => {
    if (!newNotice.title.trim() || !newNotice.content.trim()) {
      return;
    }

    const notice: Notice = {
      id: Date.now().toString(),
      title: newNotice.title,
      content: newNotice.content,
      author: "나",
      createdAt: new Date().toISOString(),
      isPinned: newNotice.isPinned,
      category: newNotice.category,
      attachments: newNotice.attachments.length > 0 ? newNotice.attachments : undefined,
    };

    setInternalNotices((prev) => [notice, ...prev]);
    setNewNotice({
      title: "",
      content: "",
      category: "공지",
      isPinned: false,
      attachments: [],
    });
    setIsFormOpen(false);
  };

  // 필터링 로직
  const filteredNotices = notices
    .filter((notice) => {
      // 카테고리 필터
      if (selectedCategory !== "전체" && notice.category !== selectedCategory) {
        return false;
      }
      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          notice.title.toLowerCase().includes(query) ||
          notice.author.toLowerCase().includes(query)
        );
      }
      return true;
    })
    // isPinned가 true인 항목을 최상단으로 정렬
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* 헤더 영역 */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">📢 팀 공지사항</h1>
          <Button onClick={() => setIsFormOpen(true)}>
            <PenSquare className="mr-2 h-4 w-4" />
            새 공지 작성
          </Button>
        </div>

        {/* 필터/검색 영역 */}
        <div className="mb-6 space-y-4">
          {/* 검색 인풋 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="제목 또는 작성자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* 새 공지 작성 모달 */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-h-[85vh] w-[66vw] max-w-none overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">새 공지 작성</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-6">
              {/* 제목 입력 */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  제목
                </Label>
                <Input
                  id="title"
                  placeholder="공지 제목을 입력하세요"
                  value={newNotice.title}
                  onChange={(e) =>
                    setNewNotice((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full"
                />
              </div>

              {/* 카테고리 선택 */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  카테고리
                </Label>
                <Select
                  value={newNotice.category}
                  onValueChange={(value: "공지" | "업무" | "기타") =>
                    setNewNotice((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="공지">공지</SelectItem>
                    <SelectItem value="업무">업무</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 본문 입력 */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-medium">
                  내용
                </Label>
                <Textarea
                  id="content"
                  placeholder="공지 내용을 입력하세요"
                  value={newNotice.content}
                  onChange={(e) =>
                    setNewNotice((prev) => ({ ...prev, content: e.target.value }))
                  }
                  className="min-h-[200px] w-full resize-none"
                />
              </div>

              {/* 첨부파일 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">첨부파일</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    파일 첨부
                  </Button>
                </div>
                {/* 첨부된 파일 목록 */}
                {newNotice.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newNotice.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">{attachment.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(attachment.size)})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 고정 여부 */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPinned"
                  checked={newNotice.isPinned}
                  onCheckedChange={(checked) =>
                    setNewNotice((prev) => ({
                      ...prev,
                      isPinned: checked === true,
                    }))
                  }
                />
                <Label htmlFor="isPinned" className="text-sm font-medium cursor-pointer">
                  상단에 고정
                </Label>
              </div>

              {/* 버튼 영역 */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSubmitNotice}
                  disabled={!newNotice.title.trim() || !newNotice.content.trim()}
                >
                  작성 완료
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 상세보기 모달 */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-h-[90vh] w-[75vw] max-w-none overflow-hidden flex flex-col">
            {selectedNotice && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedNotice.isPinned && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-200 text-amber-800"
                      >
                        고정
                      </Badge>
                    )}
                    <Badge className={categoryColors[selectedNotice.category]}>
                      {selectedNotice.category}
                    </Badge>
                  </div>
                  <DialogTitle className="text-xl font-bold">
                    {selectedNotice.title}
                  </DialogTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {selectedNotice.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(selectedNotice.createdAt)}
                    </span>
                  </div>
                </DialogHeader>

                <div className="flex flex-1 gap-4 mt-4 overflow-hidden">
                  {/* 왼쪽: 본문 및 첨부파일 목록 */}
                  <div className={`flex flex-col ${previewAttachment ? "w-1/3" : "w-full"}`}>
                    <div className="flex-1 overflow-y-auto">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedNotice.content}
                      </p>
                    </div>

                    {/* 첨부파일 목록 */}
                    {selectedNotice.attachments && selectedNotice.attachments.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          첨부파일 ({selectedNotice.attachments.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedNotice.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                                previewAttachment?.id === attachment.id
                                  ? "bg-primary/10 border-primary"
                                  : "bg-muted/50 hover:bg-muted"
                              }`}
                              onClick={() => setPreviewAttachment(attachment)}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                  {attachment.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({formatFileSize(attachment.size)})
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewAttachment(attachment);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(attachment.url, "_blank");
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: PDF 미리보기 */}
                  {previewAttachment && (
                    <div className="w-2/3 flex flex-col border rounded-lg overflow-hidden bg-muted/30">
                      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium truncate">
                            {previewAttachment.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(previewAttachment.url, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            다운로드
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewAttachment(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {previewAttachment.type === "application/pdf" ? (
                          <iframe
                            src={previewAttachment.url}
                            className="w-full h-full min-h-[400px]"
                            title={previewAttachment.name}
                          />
                        ) : previewAttachment.type.startsWith("image/") ? (
                          <div className="w-full h-full flex items-center justify-center p-4">
                            <img
                              src={previewAttachment.url}
                              alt={previewAttachment.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
                            <FileText className="h-16 w-16 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground text-center">
                              이 파일 형식은 미리보기가 지원되지 않습니다.
                            </p>
                            <Button
                              onClick={() => window.open(previewAttachment.url, "_blank")}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              파일 다운로드
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 공지 카드 목록 */}
        {filteredNotices.length > 0 ? (
          <div className="space-y-4">
            {filteredNotices.map((notice) => (
              <Card
                key={notice.id}
                className={`transition-shadow duration-200 hover:shadow-lg ${
                  notice.isPinned
                    ? "border-amber-200 bg-amber-50"
                    : "border-gray-100 bg-white"
                }`}
              >
                <CardContent className="p-5">
                  {/* 상단: 배지들 */}
                  <div className="mb-3 flex items-center gap-2">
                    {notice.isPinned && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-200 text-amber-800 hover:bg-amber-200"
                      >
                        📌 고정
                      </Badge>
                    )}
                    <Badge className={categoryColors[notice.category]}>
                      {notice.category}
                    </Badge>
                  </div>

                  {/* 제목 */}
                  <h2
                    className="mb-2 cursor-pointer text-lg font-semibold text-gray-900 hover:text-blue-600"
                    onClick={() => handleOpenDetail(notice)}
                  >
                    {notice.title}
                  </h2>

                  {/* 본문 미리보기 */}
                  <p className="mb-3 text-sm text-gray-600">
                    {truncateContent(notice.content)}
                  </p>

                  {/* 첨부파일 표시 */}
                  {notice.attachments && notice.attachments.length > 0 && (
                    <div className="mb-3 flex items-center gap-1 text-sm text-blue-600">
                      <Paperclip className="h-4 w-4" />
                      <span>첨부파일 {notice.attachments.length}개</span>
                    </div>
                  )}

                  {/* 하단: 작성자, 날짜, 삭제 버튼 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {notice.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(notice.createdAt)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(notice.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* 빈 상태 */
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Inbox className="mb-4 h-16 w-16 text-gray-300" />
            <p className="text-lg">검색 결과가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
