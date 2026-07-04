// 최초 1회 로컬에서 실행해서 GOOGLE_REFRESH_TOKEN을 발급받는 스크립트.
//
// 사용법:
//   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-gmail-refresh-token.mjs
//
// 실행하면 브라우저가 열리고, Google 계정으로 로그인 후 Gmail 읽기 권한에 동의하면
// 터미널에 refresh_token이 출력된다. 그 값을 .env.local의 GOOGLE_REFRESH_TOKEN에 저장한다.

import { OAuth2Client } from "google-auth-library";
import http from "node:http";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 환경변수가 필요합니다.");
  console.error("예: GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-gmail-refresh-token.mjs");
  process.exit(1);
}

const oAuth2Client = new OAuth2Client({ clientId, clientSecret, redirectUri: REDIRECT_URI });

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // refresh_token을 매번 발급받기 위해 필요
  scope: SCOPES,
});

console.log("\n아래 URL을 브라우저에서 열어 Google 계정으로 로그인하고 권한에 동의하세요:\n");
console.log(authUrl, "\n");
console.log(`(리디렉션을 받기 위해 http://localhost:${PORT} 에서 임시로 대기 중...)\n`);

// GOOGLE_CLIENT_ID가 웹 애플리케이션 타입이라면, GCP 콘솔의
// "승인된 리디렉션 URI"에 위 REDIRECT_URI를 반드시 추가해야 한다.

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, REDIRECT_URI);
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404).end();
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400).end("Missing code");
      return;
    }

    const { tokens } = await oAuth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>인증 완료</h1><p>터미널로 돌아가서 refresh_token을 확인하세요. 이 탭은 닫아도 됩니다.</p>");

    console.log("\n===== 아래 값을 .env.local의 GOOGLE_REFRESH_TOKEN에 저장하세요 =====\n");
    console.log(tokens.refresh_token ?? "(refresh_token이 발급되지 않았습니다. prompt=consent로 다시 시도하세요)");
    console.log("\n=====================================================\n");

    server.close();
    process.exit(0);
  } catch (err) {
    console.error("토큰 교환 실패:", err);
    res.writeHead(500).end("Token exchange failed");
    server.close();
    process.exit(1);
  }
});

server.listen(PORT);
