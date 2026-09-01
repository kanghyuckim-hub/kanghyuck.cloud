"use client";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
        {/* Left side links */}
        <div className="flex items-center gap-6">
          <a href="/" className="text-lg font-semibold text-foreground">
            경영기획
          </a>
          <a
            href="/architecture"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            건축설계
          </a>
          <a
            href="/news"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            뉴스
          </a>
          <a
            href="/mail"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            메일관리
          </a>
          <a
            href="/business-analysis"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            경영분석
          </a>
          <a
            href="/work-manual"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            업무매뉴얼
          </a>
          <a
            href="/lectures"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            강의
          </a>
          <a
            href="/member-management"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            회원관리
          </a>
        </div>

        {/* Right side links */}
        <div className="flex items-center gap-4">
          <a
            href="/notices"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            공지사항
          </a>
          <a
            href="/access-request"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            권한 신청
          </a>
          <a
            href="/api/auth/login"
            className="rounded-full border border-border px-3 py-2 text-sm text-foreground transition hover:bg-accent"
          >
            로그인
          </a>
        </div>
      </div>
    </nav>
  );
}
