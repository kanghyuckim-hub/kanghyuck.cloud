-- 공지사항 게시판 실제 저장(그동안 브라우저 메모리에만 있던 더미 데이터를 대체)

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  author text not null,
  category text not null check (category in ('공지', '업무', '기타')),
  is_pinned boolean not null default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notices_created_at on notices (created_at desc);

create table if not exists notice_attachments (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references notices(id) on delete cascade,
  name text not null,
  size bigint not null,
  type text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notice_attachments_notice_id on notice_attachments (notice_id);
