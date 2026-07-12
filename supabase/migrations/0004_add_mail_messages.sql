-- Gmail 웹훅으로 수신한 메일을 저장하는 테이블 (메일함 조회용)

create table if not exists mail_messages (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null unique,
  thread_id text,
  from_address text,
  from_name text,
  to_address text,
  subject text,
  snippet text,
  body_text text,
  body_html text,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mail_messages_received_at on mail_messages (received_at desc);
