const iconv = require('iconv-lite');
const cheerio = require('cheerio');
(async () => {
  const url = 'https://news.naver.com/section/100';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const buf = Buffer.from(await res.arrayBuffer());
  const htmlEuc = iconv.decode(buf, 'euc-kr');
  const htmlCp949 = iconv.decode(buf, 'cp949');
  console.log('euc first:', htmlEuc.slice(0, 300));
  console.log('cp949 first:', htmlCp949.slice(0, 300));
  const $euc = cheerio.load(htmlEuc);
  const $cp949 = cheerio.load(htmlCp949);
  const select = '.sa_item, .sa_text, .cjs_t';
  const printExamples = ($, label) => {
    const el = $(select).first();
    console.log(`${label} first element html:\n`, $(el).html());
    console.log(`${label} first element text:\n`, $(el).text().trim());
    console.log(`${label} first element text codes:\n`, Array.from($(el).text().trim().slice(0,20)).map((ch) => ch.codePointAt(0).toString(16)));
  };
  printExamples($euc, 'EUC');
  printExamples($cp949, 'CP949');
  const out = (selector, $) => {
    const items = [];
    $(selector).each((i, el) => {
      if (i >= 5) return false;
      items.push($(el).text().trim());
    });
    return items;
  };
  const titlesEuc = out('.sa_text_title, .cjs_t', $euc).slice(0,5);
  const titlesCp949 = out('.sa_text_title, .cjs_t', $cp949).slice(0,5);
  console.log('euc parsed titles:', titlesEuc);
  console.log('cp949 parsed titles:', titlesCp949);
})();
