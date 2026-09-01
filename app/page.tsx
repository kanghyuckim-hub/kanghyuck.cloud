import { cookies } from "next/headers";
import ChatInput from "@/components/ChatInput";
import StrategyJourneyArt from "@/components/StrategyJourneyArt";

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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-10 text-center shadow-xl">
          <div className="mb-8">
            <StrategyJourneyArt />
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
               로그인  필요
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-foreground">
              Google 계정으로 시작하기
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              하이미디어 AI 컨설팅 서비스를 이용하려면 먼저 Google 계정으로 로그인하세요.
            </p>
          </div>
          <a
            href="/api/auth/login"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Google로 로그인
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col bg-background">
      {user && (
        <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground">환영합니다,</p>
            <p className="text-lg font-semibold text-foreground">{user.name}님</p>
          </div>
          <a
            href="/api/auth/logout"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition hover:bg-accent"
          >
            로그아웃
          </a>
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-5xl">
          <StrategyJourneyArt />
        </div>
      </div>

      {user && (
        <footer className="w-full px-4 pb-8 pt-4">
          <ChatInput />
        </footer>
      )}
    </div>
  );
}
