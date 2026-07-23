import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_MODEL = "gemini-3.5-flash";
// gemini-3.5-flash가 503(과부하)일 때 상대적으로 트래픽이 덜 몰리는
// 이전 세대 모델로 한 번 더 시도하기 위한 폴백.
export const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";

export function isOverloadedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    msg.includes("503") ||
    msg.includes("service unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("high demand")
  );
}

type GenerativeModel = ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;

// Gemini가 일시적으로 과부하(503)일 때 대기 시간을 늘려가며 최대 3번 재시도한다.
const RETRY_DELAYS_MS = [2000, 5000, 10000];

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!isOverloadedError(error) || attempt >= RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

// 기본 모델로 재시도까지 모두 실패하면(계속 503) 폴백 모델로 한 번 더 시도한다.
export async function withGeminiFallback<T>(
  genAI: GoogleGenerativeAI,
  run: (model: GenerativeModel) => Promise<T>
): Promise<T> {
  const primary = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  try {
    return await withRetry(() => run(primary));
  } catch (error) {
    if (!isOverloadedError(error)) throw error;
    const fallback = genAI.getGenerativeModel({ model: GEMINI_FALLBACK_MODEL });
    return await run(fallback);
  }
}
