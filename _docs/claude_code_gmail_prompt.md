# Claude Code 입력용 프롬프트

아래 내용을 그대로 복사해서 로컬 Claude Code에 붙여넣으세요.

---

## 프롬프트 시작

Next.js(App Router) + Vercel만으로, 별도 백엔드(FastAPI, n8n 등) 없이 아래 두 가지 기능을 구현해줘.

### 목표

1. **메일 발송**: 사이트 컨택폼(이름/이메일/메시지)에서 제출하면 Resend를 통해 내 Gmail로 알림 발송
2. **메일 수신 감지**: 내 Gmail 계정에 새 메일이 도착하면 Gmail API + Google Cloud Pub/Sub Push 방식으로 감지해서, 우리 사이트의 Route Handler가 알림을 받고 메일 내용을 조회해 처리(예: 콘솔 로그 또는 DB 저장)
3. **watch() 자동 갱신**: Gmail의 `users.watch()`는 최대 7일마다 만료되므로, Vercel Cron Job으로 매일 자동 갱신되게 구성

### 환경

- Next.js 14+ (App Router), TypeScript
- Vercel 배포 (Hobby 플랜 기준, Cron은 하루 1회 제한 고려)
- 외부 백엔드 서버 없음 — 모든 로직은 Next.js Route Handler 안에서 처리
- 이메일 발송: Resend
- 이메일 수신 감지: Gmail API + Google Cloud Pub/Sub

### 요구 파일 구조

```
app/
  contact/
    ContactForm.tsx        # 프론트 폼 컴포넌트 (fetch, 성공/실패 상태 처리)
  api/
    send/
      route.ts             # Resend로 메일 발송
    gmail-webhook/
      route.ts             # Pub/Sub push 알림 수신 → Gmail API로 메일 본문 조회
    gmail-renew-watch/
      route.ts             # watch() 재등록 (Cron이 호출)
lib/
  gmail.ts                 # Gmail API 클라이언트 초기화, OAuth2 토큰 리프레시 로직
  google-auth.ts           # google-auth-library 기반 서비스/사용자 인증 헬퍼
vercel.json                # Cron 스케줄 설정
.env.local.example
SETUP.md                   # 아래 "직접 해야 하는 작업" 문서화
```

### 세부 요구사항

**1. 발송 (`app/api/send/route.ts`)**
- POST로 `{ name, email, message }` 받아서 검증 (빈 값, 이메일 형식) 후 Resend로 발송
- Resend API 키는 `process.env.RESEND_API_KEY`
- 실패 시 적절한 상태 코드와 에러 메시지 반환

**2. 수신 웹훅 (`app/api/gmail-webhook/route.ts`)**
- Pub/Sub가 보내는 POST 요청의 JWT를 검증해서 진짜 Google에서 온 요청인지 확인 (`google-auth-library`의 `OAuth2Client.verifyIdToken` 또는 Pub/Sub push 인증 방식 사용)
- 페이로드는 `{ message: { data: base64 } }` 형태이며, data를 디코드하면 `{ emailAddress, historyId }` 정도만 있음 (메일 본문은 없음)
- `historyId`로 Gmail API `users.history.list` 호출해서 실제 변경 내역 조회 → 새 메일이면 `users.messages.get`으로 본문 조회
- 처리 결과는 우선 콘솔 로그로 출력 (추후 DB 연동 여지를 남겨줘)

**3. watch 갱신 (`app/api/gmail-renew-watch/route.ts`)**
- `users.watch({ topicName: 'projects/{project}/topics/{topic}' })` 호출
- 이 엔드포인트는 외부(Vercel Cron)에서만 호출되도록 secret 헤더나 쿼리 토큰으로 보호 (`CRON_SECRET` 환경변수 비교)

**4. `vercel.json`**
- 매일 1회 `/api/gmail-renew-watch` 호출하는 cron 스케줄 작성 (Hobby 플랜 제약 고려)

**5. Gmail API 인증 (`lib/gmail.ts`, `lib/google-auth.ts`)**
- OAuth2 Refresh Token 방식 사용 (최초 1회 발급 후 환경변수로 저장하는 구조)
- `googleapis` 패키지의 `google.gmail('v1')` 사용
- 토큰 갱신 로직 포함

**6. 보안**
- 모든 시크릿(RESEND_API_KEY, GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN, CRON_SECRET)은 환경변수로만 처리, 코드에 하드코딩 금지
- `.env.local`은 `.gitignore`에 포함되어 있는지 확인하고, `.env.local.example`은 값 없이 키 목록만 제공
- 웹훅 엔드포인트는 반드시 요청 출처 검증 로직 포함 (검증 없는 임의 POST 수락 금지)

**7. `SETUP.md` 작성**
코드로 자동화할 수 없는, 내가 GCP 콘솔/Google Cloud에서 직접 해야 하는 단계를 순서대로 정리해줘. 최소한 아래 항목 포함:
- GCP 프로젝트 생성 및 Gmail API 활성화
- OAuth 동의 화면 설정 + OAuth Client ID/Secret 발급
- Refresh Token 최초 발급 방법 (로컬에서 1회 실행하는 스크립트 형태로 안내)
- Pub/Sub 토픽 생성 및 `gmail-api-push@system.gserviceaccount.com`에 게시 권한 부여
- Pub/Sub Push subscription 생성 시 endpoint URL을 우리 Vercel 배포 도메인의 `/api/gmail-webhook`으로 지정하는 방법
- Vercel 대시보드에서 환경변수 등록 방법
- Vercel Cron이 Hobby 플랜에서 하루 1회로 제한된다는 점과, 필요시 대안(cron-job.org 등 외부 크론)

### 마지막 안내

- 설치해야 하는 npm 패키지 명령어 전체 정리해줘 (resend, googleapis, google-auth-library 등)
- 전체 작업이 끝나면 로컬에서 어떤 순서로 테스트하면 되는지 (예: ngrok으로 로컬 테스트 가능 여부 포함) 안내해줘

## 프롬프트 끝
