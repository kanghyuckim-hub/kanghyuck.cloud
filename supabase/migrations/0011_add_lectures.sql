-- 강의 게시판: 자료(PDF) 업로드 -> Gemini가 슬라이드/내레이션 대본으로 변환
-- -> 브라우저에서 동물 캐릭터 + TTS로 재생하는 강의 영상 형태로 재생
-- (실제 mp4 렌더링은 하지 않고, 슬라이드/내레이션 JSON을 저장해 클라이언트에서 재생)

create table if not exists lectures (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  blob_url text not null,
  title text not null,
  character_key text not null default 'fox',
  slides jsonb not null,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
