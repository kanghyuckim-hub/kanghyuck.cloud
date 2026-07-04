import Link from "next/link";

export default function BoardAccessDenied() {
  return (
    <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-gray-500">
          이 게시판을 이용하려면 관리자에게 권한 부여를 요청하세요.
        </p>
        <Link
          href="/access-request"
          className="mt-4 inline-block rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
        >
          게시판 이용 신청하기
        </Link>
      </div>
    </div>
  );
}
