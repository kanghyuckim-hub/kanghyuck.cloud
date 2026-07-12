-- 업무매뉴얼 질의응답은 로그인 없이 공개로 전환. 게시판 접근권한 대상에서 제외.
-- (user_board_access는 boards(key)에 on delete cascade가 걸려있어 관련 권한 부여 행도 함께 삭제됨)

delete from boards where key = 'work-manual';
