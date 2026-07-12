-- 질문/답변 로그에 어느 매뉴얼(source_file)에서 근거를 찾았는지 기록
-- (매뉴얼별 업데이트본 생성 시 해당 매뉴얼과 관련된 Q&A만 골라내기 위함)

alter table work_manual_questions add column if not exists source_file text;
