-- 실적추정(진행율매출 시뮬레이션) 게시판 접근권한 등록

insert into boards (key, label, sort_order) values
  ('performance-estimate', '실적추정', 5)
on conflict (key) do nothing;
