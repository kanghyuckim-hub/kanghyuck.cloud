-- 업무매뉴얼 챗봇에 들어온 질문 로그 + 주간 집계로 만드는 자주묻는질문(FAQ) 목록

create table if not exists work_manual_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_work_manual_questions_created_at on work_manual_questions (created_at desc);

create table if not exists work_manual_faq (
  id uuid primary key default gen_random_uuid(),
  rank integer not null,
  question text not null,
  answer text not null,
  ask_count integer not null default 0,
  updated_at timestamptz not null default now()
);
