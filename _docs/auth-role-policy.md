# 인증 및 권한 정책

## 1. 역할(role) 체계

| 역할 | 값 | 설명 |
| --- | --- | --- |
| 마스터 | `master` | 시스템 최고 관리자. 모든 게시판(메뉴)에 자동으로 접근 가능하며, 별도의 게시판 권한 부여가 필요 없다. |
| 관리자 | `admin` | 회원관리 화면에서 각 회원의 게시판 이용 권한을 추가/해제할 수 있다. |
| 일반회원 | `user` | 기본 역할. 관리자가 부여한 게시판만 이용 가능하다는 정책을 전제로 한다. |

- 신규 회원은 Google OAuth 로그인 시 `users` 테이블에 생성되고, 트리거(`create_default_user_role`)에 의해 `user_roles.role = 'user'`가 자동 부여된다.
- 역할 값은 `user_roles.role` 컬럼의 `check` 제약(`user_roles_role_check`)으로 `master` / `admin` / `user` 세 가지만 허용한다. (`supabase/migrations/0002_add_master_role_and_board_access.sql`)
- 현재 마스터 계정: `kanghyuck.im@gmail.com` (DB에 등록된 유일한 계정을 2026-07-04 기준으로 지정).

## 2. 게시판(메뉴) 목록

`boards` 테이블에 시스템의 게시판(메뉴)을 등록해 관리한다. Navbar(`components/Navbar.tsx`)의 메뉴와 1:1로 대응한다.

| key | label | 설명 |
| --- | --- | --- |
| `architecture` | 건축설계 | `/architecture` |
| `business-analysis` | 경영분석 | `/business-analysis` |
| `news` | 뉴스 | `/news` |
| `mail` | 메일관리 | `/mail` |
| `auto-report` | 자동보고서 | `/auto-report` |
| `member-management` | 회원관리 | `/member-management` |
| `notices` | 공지사항 | `/notices` |

새 게시판(메뉴)이 추가되면 `boards` 테이블에 `key`/`label`/`sort_order`를 추가하면 회원관리 화면의 권한 설정 목록에 자동으로 반영된다.

## 3. 회원별 게시판 권한 데이터 모델

- `user_board_access(user_id, board_key)`: 특정 회원이 이용할 수 있는 게시판을 나타내는 매핑 테이블. `user_id` + `board_key` 복합 기본키로, 회원당 게시판 하나에 대해 행 하나가 존재하면 "이용 가능"을 의미한다.
- `master`와 `admin`은 관리자로 간주해 이 테이블과 무관하게 모든 게시판에 접근 가능하다 (UI에서도 별도 설정 없이 "전체 접근"으로 안내). `admin`도 회원관리 페이지를 포함한 모든 게시판에 항상 접근할 수 있으므로, 권한 위임 자체가 막히는 문제가 없다.
- `user` 역할 회원만 `user_board_access`에 등록된 게시판만 이용 가능하다.

## 3-1. 페이지 단위 접근 제어

각 게시판 페이지는 서버 컴포넌트에서 `lib/board-access.ts`의 `requireBoardAccess(boardKey)`를 호출해 접근 여부를 확인한다.

- 로그인하지 않은 경우 `/api/auth/login?returnTo=<경로>`로 리다이렉트한다.
- 로그인했지만 권한이 없는 경우 `components/BoardAccessDenied.tsx`("접근 권한이 없습니다") 화면을 렌더링한다.
- `lib/auth.ts`의 `getSessionMember()`가 `authUser` 쿠키(이메일)로 `users`/`user_roles`를 조회해 현재 로그인한 회원의 `id`/`role`을 가져온다.

`"use client"`로 작성된 기존 페이지들(건축설계, 경영분석, 메일관리, 회원관리)은 인터랙션 로직을 `*Client.tsx`로 분리하고, `page.tsx`는 접근 검사만 수행하는 서버 컴포넌트로 감싸는 구조로 변경했다:

- `app/architecture/page.tsx` → `app/architecture/ArchitectureClient.tsx`
- `app/business-analysis/page.tsx` → `app/business-analysis/BusinessAnalysisClient.tsx`
- `app/mail/page.tsx` → `app/mail/MailClient.tsx`
- `app/member-management/page.tsx` → `app/member-management/MemberManagementClient.tsx`

뉴스/공지사항/자동보고서 페이지는 원래 서버 컴포넌트였으므로 `page.tsx`에 직접 접근 검사를 추가했다.

## 4. 회원별 게시판 권한 추가 메뉴 (회원관리 화면)

`/member-management` 화면에 회원별 "권한 설정" 버튼을 추가했다.

- 버튼 클릭 시 다이얼로그가 열리고, 해당 회원이 이용 가능한 게시판을 체크박스로 선택할 수 있다.
- 마스터 회원은 체크박스 대신 "모든 게시판에 자동으로 접근 가능" 안내만 표시한다.
- 저장 시 선택된 게시판 목록으로 해당 회원의 `user_board_access` 레코드를 전체 교체(delete → insert)한다.

관련 API:

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/api/boards` | 전체 게시판 목록 조회 |
| GET | `/api/members/[id]/board-access` | 특정 회원이 이용 가능한 게시판 key 목록 조회 |
| PUT | `/api/members/[id]/board-access` | 특정 회원의 게시판 권한을 body의 `boardKeys` 배열로 교체 |

관련 파일:

- `supabase/migrations/0002_add_master_role_and_board_access.sql` — `master` role 추가, `boards`/`user_board_access` 테이블, 초기 게시판 시드, 마스터 계정 지정
- `app/api/boards/route.ts`
- `app/api/members/[id]/board-access/route.ts`
- `app/member-management/MemberManagementClient.tsx` — `BoardAccessDialog` 컴포넌트
- `lib/auth.ts`, `lib/board-access.ts`, `components/BoardAccessDenied.tsx` — 페이지 단위 접근 제어
