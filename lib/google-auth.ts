import { OAuth2Client } from "google-auth-library";

let cachedClient: OAuth2Client | null = null;

/**
 * Refresh Token 기반 OAuth2Client. Gmail API 호출에 사용.
 * googleapis 라이브러리가 만료된 access_token을 refresh_token으로 자동 갱신한다.
 */
export function getOAuth2Client(): OAuth2Client {
  if (cachedClient) return cachedClient;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN env vars"
    );
  }

  const client = new OAuth2Client({ clientId, clientSecret });
  client.setCredentials({ refresh_token: refreshToken });

  cachedClient = client;
  return client;
}

const pubsubAuthClient = new OAuth2Client();

/**
 * Pub/Sub push 구독이 보낸 요청인지 검증한다.
 * 구독을 생성할 때 지정한 서비스 계정과 audience(엔드포인트 URL)를 기준으로 OIDC 토큰을 검증한다.
 * https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
 */
export async function verifyPubSubPushRequest(
  authorizationHeader: string | null,
  expectedAudience: string
): Promise<boolean> {
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const token = authorizationHeader.slice("Bearer ".length);

  const expectedServiceAccount = process.env.PUBSUB_PUSH_SERVICE_ACCOUNT;
  if (!expectedServiceAccount) {
    throw new Error("Missing PUBSUB_PUSH_SERVICE_ACCOUNT env var");
  }

  try {
    const ticket = await pubsubAuthClient.verifyIdToken({
      idToken: token,
      audience: expectedAudience,
    });
    const payload = ticket.getPayload();
    return payload?.email === expectedServiceAccount && payload?.email_verified === true;
  } catch {
    return false;
  }
}
