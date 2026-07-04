# 메일 발송 / 수신 감지 설정 가이드

이 문서는 코드로 자동화할 수 없는, GCP 콘솔·Resend 대시보드·Vercel 대시보드에서
직접 해야 하는 설정을 순서대로 정리한다.

## 0. 설치된 npm 패키지

이미 설치 완료:

```bash
npm install resend googleapis google-auth-library
```

## 1. Resend 설정 (메일 발송)

1. https://resend.com 가입 후 API Key 발급 → `RESEND_API_KEY`
2. 발신 도메인 인증(Domains 메뉴)을 하지 않으면 `onboarding@resend.dev` 같은 테스트 발신 주소만 사용 가능하고, 받는 사람도 Resend 계정 소유자 이메일로 제한된다. 실제 운영에서는 본인 도메인을 등록하고 DNS(SPF/DKIM) 설정 후 `CONTACT_FROM_EMAIL`을 해당 도메인 주소로 지정할 것.
3. `CONTACT_TO_EMAIL`은 알림을 받을 본인 Gmail 주소.

## 2. GCP 프로젝트 생성 및 Gmail API 활성화

1. https://console.cloud.google.com 에서 새 프로젝트 생성 (또는 기존 프로젝트 사용)
2. 좌측 메뉴 "API 및 서비스 > 라이브러리"에서 **Gmail API** 검색 후 사용 설정
3. 같은 방식으로 **Cloud Pub/Sub API** 도 사용 설정

## 3. OAuth 동의 화면 + OAuth Client 발급

1. "API 및 서비스 > OAuth 동의 화면"에서 User Type을 **외부(External)** 로 선택, 앱 이름/이메일 등 기본 정보 입력
2. 테스트 사용자(Test users)에 본인 Gmail 계정 추가 (앱 검토를 받기 전까지는 등록된 테스트 사용자만 로그인 가능)
3. "API 및 서비스 > 사용자 인증 정보 > 사용자 인증 정보 만들기 > OAuth 클라이언트 ID" 선택
   - 애플리케이션 유형: **웹 애플리케이션**
   - 승인된 리디렉션 URI에 `http://localhost:53682/oauth2callback` 추가 (아래 4단계 스크립트가 사용하는 주소)
4. 생성된 클라이언트 ID/Secret을 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 저장

## 4. Refresh Token 최초 발급 (로컬 1회 실행)

레포에 포함된 스크립트를 로컬에서 한 번만 실행한다.

```bash
GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-gmail-refresh-token.mjs
```

1. 터미널에 출력된 URL을 브라우저로 열기
2. 3단계에서 테스트 사용자로 등록한 Gmail 계정으로 로그인 후 Gmail 읽기 권한 동의
3. 리디렉션 후 터미널에 출력되는 `refresh_token` 값을 `.env.local`의 `GOOGLE_REFRESH_TOKEN`에 저장

> refresh_token은 최초 동의 시(또는 `prompt=consent`로 재동의 시)에만 발급된다. 값을 분실하면 스크립트를 다시 실행해서 재발급받으면 된다.

## 5. Pub/Sub 토픽 생성 및 Gmail 게시 권한 부여

1. Cloud Console > Pub/Sub > 토픽 만들기 (예: `gmail-inbox-notify`)
   - 전체 이름: `projects/{project-id}/topics/gmail-inbox-notify` → `GOOGLE_PUBSUB_TOPIC`에 저장
2. 생성한 토픽 선택 > 권한(Permissions) 탭 > 주 구성원 추가
   - 주 구성원: `gmail-api-push@system.gserviceaccount.com`
   - 역할: **Pub/Sub 게시자(Publisher)**

이 권한이 없으면 `users.watch()` 호출 시 권한 오류가 발생한다.

## 6. Pub/Sub Push Subscription 생성

1. 5단계 토픽 선택 > 구독(Subscriptions) 탭 > 구독 만들기
2. 전달 유형: **Push**
3. Endpoint URL: `https://{배포된 Vercel 도메인}/api/gmail-webhook`
4. **인증 활성화(Enable authentication)** 체크
   - 서비스 계정 선택 또는 새로 생성 (예: `pubsub-push-invoker@{project-id}.iam.gserviceaccount.com`)
   - 이 서비스 계정 이메일을 `.env.local`의 `PUBSUB_PUSH_SERVICE_ACCOUNT`에 저장 (웹훅이 OIDC 토큰 발급자를 검증하는 데 사용)
   - Audience는 기본값(Endpoint URL)을 그대로 사용하면 됨 → 코드도 기본적으로 요청 origin + `/api/gmail-webhook`을 audience로 검증하므로 별도 설정 불필요. 다르게 지정했다면 `PUBSUB_PUSH_AUDIENCE`에 그 값을 저장.

> 로컬 개발 중에는 아직 배포 도메인이 없으므로, 이 단계는 최초 Vercel 배포 이후에 진행한다. (아래 "로컬 테스트" 섹션 참고)

## 7. Vercel 대시보드 환경변수 등록

프로젝트 Settings > Environment Variables에 `.env.local.example`에 나열된 모든 키를 등록한다:

- `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_PUBSUB_TOPIC`
- `PUBSUB_PUSH_SERVICE_ACCOUNT`, (필요시) `PUBSUB_PUSH_AUDIENCE`
- `CRON_SECRET` (임의의 긴 랜덤 문자열 생성해서 저장)

Vercel Cron은 `CRON_SECRET` 환경변수가 설정되어 있으면 실행 시 자동으로
`Authorization: Bearer $CRON_SECRET` 헤더를 붙여 호출하므로, 별도 설정 없이
`/api/gmail-renew-watch`의 인증 로직과 맞물려 동작한다.

## 8. Vercel Cron 제약 (Hobby 플랜)

- `vercel.json`에 매일 1회(`0 18 * * *`, UTC 18:00 = KST 03:00) `/api/gmail-renew-watch`를 호출하도록 설정해 두었다.
- Hobby 플랜은 **크론 작업당 하루 1회**만 허용된다. Gmail `watch()`는 최대 7일 유효하므로 하루 1회 갱신이면 충분히 여유 있다.
- Hobby 플랜에서 더 짧은 주기가 필요하거나 Vercel Cron 자체가 불안정하다고 느껴지면 [cron-job.org](https://cron-job.org) 같은 외부 무료 크론 서비스에서
  `GET https://{도메인}/api/gmail-renew-watch?secret={CRON_SECRET}` 을 원하는 주기로 호출하도록 등록하는 대안도 가능하다.

## 로컬에서 테스트하는 순서

1. `.env.local`에 1~4단계에서 얻은 값(Resend, Google OAuth) 채우기
2. `npm run dev`로 로컬 서버 실행 후 `/contact` 페이지에서 폼 제출 → Resend 발송 확인 (Pub/Sub 없이도 테스트 가능)
3. Gmail 수신 감지는 Google이 공인 HTTPS 엔드포인트로만 Push를 보낼 수 있어 `localhost`로는 직접 테스트 불가하다. 방법은 두 가지:
   - **권장**: 먼저 Vercel에 배포한 뒤, 6단계에서 배포 도메인을 Endpoint로 등록하고 실제 메일을 보내 확인
   - **로컬에서 확인하고 싶다면**: `ngrok http 3000`으로 임시 HTTPS 터널을 만들고, 6단계 Endpoint URL을 `https://{ngrok-subdomain}.ngrok-free.app/api/gmail-webhook`으로 등록. ngrok URL은 재시작 시 바뀌므로 테스트 후 실제 배포 도메인으로 다시 바꿔줘야 한다. Push 구독의 audience도 이 ngrok URL과 일치해야 하므로, ngrok을 쓸 때는 `.env.local`에 `PUBSUB_PUSH_AUDIENCE=https://{ngrok-subdomain}.ngrok-free.app/api/gmail-webhook`을 명시한다.
4. `watch()` 최초 등록은 `/api/gmail-renew-watch`를 한 번 수동 호출해서 트리거한다:
   ```bash
   curl "http://localhost:3000/api/gmail-renew-watch?secret=$CRON_SECRET"
   ```
5. 등록 후 본인 Gmail로 테스트 메일을 보내보고, `/api/gmail-webhook`이 호출되는지 서버 콘솔 로그(`[gmail-webhook] new message received`)로 확인한다.
