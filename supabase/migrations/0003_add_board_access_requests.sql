-- 게시판 설명 + 회원별 게시판 이용 신청/승인 테이블

alter table boards add column if not exists description text;

update boards set description = '건축설계 입찰공고 및 건축법 개정안을 확인할 수 있는 게시판입니다.' where key = 'architecture';
update boards set description = '재무분석, 월간실적보고 등 경영 데이터를 분석하는 게시판입니다.' where key = 'business-analysis';
update boards set description = '건축/부동산 관련 뉴스를 모아보는 게시판입니다.' where key = 'news';
update boards set description = '이메일 발송 및 수신 내역을 관리하는 게시판입니다.' where key = 'mail';
update boards set description = 'AI로 월간실적보고서를 자동 생성하는 게시판입니다.' where key = 'auto-report';
update boards set description = '회원 정보 및 게시판 이용 권한을 관리하는 게시판입니다. (관리자 전용)' where key = 'member-management';
update boards set description = '공지사항을 확인하는 게시판입니다.' where key = 'notices';

create table if not exists board_access_requests (
  user_id uuid primary key references users(id) on delete cascade,
  requested_board_keys text[] not null default '{}',
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_board_keys text[],
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_board_access_requests_updated_at on board_access_requests;
create trigger trg_board_access_requests_updated_at
  before update on board_access_requests
  for each row execute function set_updated_at();
