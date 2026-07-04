const fetch = global.fetch;
(async () => {
  const url = 'https://news.naver.com/section/100';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const buf = Buffer.from(await res.arrayBuffer());
  const marker = Buffer.from('<strong class="sa_text_strong">');
  const idx = buf.indexOf(marker);
  if (idx === -1) {
    console.log('marker not found');
    return;
  }
  const slice = buf.slice(idx, idx + 200);
  const utf8 = slice.toString('utf8');
  const euckr = require('iconv-lite').decode(slice, 'euc-kr');
  const cp949 = require('iconv-lite').decode(slice, 'cp949');
  console.log('hex:', slice.toString('hex'));
  console.log('utf8 codes:', Array.from(utf8.slice(0,20)).map((c) => c.codePointAt(0).toString(16)));
  console.log('euc codes:', Array.from(euckr.slice(0,20)).map((c) => c.codePointAt(0).toString(16)));
  console.log('cp949 codes:', Array.from(cp949.slice(0,20)).map((c) => c.codePointAt(0).toString(16)));
  const hangulCount = (str) => (str.match(/[\u3131-\uD79D]/g) || []).length;
  console.log('utf8 hangul count:', hangulCount(utf8));
  console.log('euc hangul count:', hangulCount(euckr));
  console.log('cp949 hangul count:', hangulCount(cp949));
  console.log('utf8 snippet json:', JSON.stringify(utf8.slice(0,40)));
  console.log('euc snippet json:', JSON.stringify(euckr.slice(0,40)));
  console.log('cp949 snippet json:', JSON.stringify(cp949.slice(0,40)));
})();
