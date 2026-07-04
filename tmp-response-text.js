const fs = require('fs');
(async () => {
  const url = 'https://news.naver.com/section/100';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const text = await res.text();
  fs.writeFileSync('tmp-response-text.html', text, 'utf8');
  console.log('saved tmp-response-text.html');
})();
