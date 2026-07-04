const iconv = require('iconv-lite');
const fetch = global.fetch;
(async () => {
  const url = 'https://news.naver.com/section/100';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const buf = Buffer.from(await res.arrayBuffer());
  const html = iconv.decode(buf, 'euc-kr');
  const $ = require('cheerio').load(html);
  const title = $('.sa_text_title').first().text().trim();
  console.log('raw title:', title);
  console.log('raw codes:', Array.from(title.slice(0,20)).map((c) => c.codePointAt(0).toString(16)));
  const recovered1 = iconv.decode(Buffer.from(title, 'binary'), 'utf8');
  console.log('recovered1:', recovered1);
  console.log('recovered1 codes:', Array.from(recovered1.slice(0,20)).map((c) => c.codePointAt(0).toString(16)));
  const recovered2 = iconv.decode(Buffer.from(title, 'binary'), 'euc-kr');
  console.log('recovered2:', recovered2);
})();