import Image from "next/image";
import { cookies } from "next/headers";
import ChatInput from "@/components/ChatInput";

type AuthUser = {
  name: string;
  email: string;
  picture?: string;
};

function parseAuthUser(cookieValue?: string): AuthUser | null {
  if (!cookieValue) {
    return null;
  }

  try {
    const decoded = Buffer.from(cookieValue, "base64").toString("utf8");
    return JSON.parse(decoded) as AuthUser;
  } catch {
    return null;
  }
}

export default async function Home() {
  const cookiesStore = await cookies();
  const authCookie = cookiesStore.get("authUser")?.value;
  const user = parseAuthUser(authCookie);
  const googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  if (!user && googleConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
               로그인  필요
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
              Google 계정으로 시작하기
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              하이미디어 AI 컨설팅 서비스를 이용하려면 먼저 Google 계정으로 로그인하세요.
            </p>
          </div>
          <a
            href="/api/auth/login"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Google로 로그인
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col bg-white">
      {user && (
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4">
          <div>
            <p className="text-sm text-slate-500">환영합니다,</p>
            <p className="text-lg font-semibold text-slate-900">{user.name}님</p>
          </div>
          <a
            href="/api/auth/logout"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            로그아웃
          </a>
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <Image
          src="/images/consulting.jpg"
          alt="경영컨설팅 이미지"
          width={800}
          height={450}
          className="rounded-lg shadow-md"
          priority
        />
      </div>

      {user && (
        <footer className="w-full px-4 pb-8 pt-4">
          <ChatInput />
        </footer>
      )}
    </div>
  );
}
