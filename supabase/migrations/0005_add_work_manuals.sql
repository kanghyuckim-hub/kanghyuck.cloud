-- 업무매뉴얼 업로드 + 질의응답 기능

insert into boards (key, label, sort_order) values
  ('work-manual', '업무매뉴얼', 8)
on conflict (key) do nothing;

create table if not exists work_manuals (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  blob_url text not null,
  content_text text not null,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
