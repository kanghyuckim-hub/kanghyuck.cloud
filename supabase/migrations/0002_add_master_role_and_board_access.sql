-- master 권한 추가 + 회원별 게시판 이용 권한 테이블

alter table user_roles drop constraint if exists user_roles_role_check;
alter table user_roles add constraint user_roles_role_check
  check (role in ('master', 'admin', 'user'));

-- 게시판(메뉴) 목록
create table if not exists boards (
  key text primary key,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into boards (key, label, sort_order) values
  ('architecture', '건축설계', 1),
  ('business-analysis', '경영분석', 2),
  ('news', '뉴스', 3),
  ('mail', '메일관리', 4),
  ('auto-report', '자동보고서', 5),
  ('member-management', '회원관리', 6),
  ('notices', '공지사항', 7)
on conflict (key) do nothing;

-- 회원별로 이용 가능한 게시판 (master는 전체 게시판에 암묵적으로 접근 가능하므로 별도 부여 불필요)
create table if not exists user_board_access (
  user_id uuid not null references users(id) on delete cascade,
  board_key text not null references boards(key) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, board_key)
);

-- 현재 로그인 이력이 있는 계정을 마스터로 지정
update user_roles set role = 'master'
where user_id = (select id from users where email = 'kanghyuck.im@gmail.com');
