"use client";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
        {/* Left side links */}
        <div className="flex items-center gap-6">
          <a href="/" className="text-lg font-semibold text-gray-900">
            경영기획
          </a>
          <a
            href="/architecture"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            건축설계
          </a>
          <a
            href="/news"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            뉴스
          </a>
          <a
            href="/mail"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            메일관리
          </a>
          <a
            href="/business-analysis"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            재무분석
          </a>
          <a
            href="/auto-report"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            자동보고서
          </a>
          <a
            href="/work-manual"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            업무매뉴얼
          </a>
          <a
            href="/member-management"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            회원관리
          </a>
        </div>

        {/* Right side links */}
        <div className="flex items-center gap-4">
          <a
            href="/notices"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            공지사항
          </a>
          <a
            href="/access-request"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            권한 신청
          </a>
          <a
            href="/api/auth/login"
            className="rounded-full border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
          >
            로그인
          </a>
        </div>
      </div>
    </nav>
  );
}
