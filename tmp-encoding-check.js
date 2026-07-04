const iconv = require('iconv-lite');
(async () => {
  try {
    const url = 'https://news.naver.com/main/list.naver?mode=LSD&mid=shm&sid1=100';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    console.log('content-type:', res.headers.get('content-type'));
    const buffer = Buffer.from(await res.arrayBuffer());
    const utf8 = iconv.decode(buffer, 'utf-8');
    const euc = iconv.decode(buffer, 'euc-kr');
    const countUtf8 = (utf8.match(/[\u3131-\uD79D]/g) || []).length;
    const countEuc = (euc.match(/[\u3131-\uD79D]/g) || []).length;
    console.log('count utf8', countUtf8, 'count euc', countEuc);
    console.log('utf8 slice:\n', utf8.slice(0, 500));
    console.log('euc slice:\n', euc.slice(0, 500));
  } catch (error) {
    console.error(error);
  }
})();
