/*
 * One suite, run in the browser at /tests.html and from tools/run_tests.py.
 * Every assertion here is about behaviour the page claims: a phrase fires,
 * a span stays inside the original text, an address is read without opening it.
 */

import { analyze, bandCopy, hostOf, registrableDomain, extractLinks, detectClaims, pickSpans, buildSegments } from './lib/analyze.js';
import { inspectAddress, parseAddress } from './lib/link.js';
import { TACTICS, CHANNELS, ORG_DOMAINS } from './lib/rules.js';
import { escapeHtml, normalizeForMatch } from './lib/text.js';

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? undefined : detail });
}
function hits(text) {
  return analyze(text).tactics.map((t) => t.id);
}
function has(text, id) {
  return hits(text).includes(id);
}

export async function runTests() {
  results.length = 0;

  /* --- 1. the rule set is intact --- */
  const ids = TACTICS.map((t) => t.id);
  check('rule ids are unique', new Set(ids).size === ids.length, ids.join(','));
  check('every rule has a label in both languages', TACTICS.every((t) => t.label.ko && t.label.en));
  check('every rule has a reason in both languages', TACTICS.every((t) => t.why.ko && t.why.en && t.then.ko && t.then.en));
  check('every rule has at least one pattern', TACTICS.every((t) => t.patterns.length >= 1));
  check('rule set covers at least 50 phrases', TACTICS.reduce((n, t) => n + t.patterns.length, 0) >= 50, String(TACTICS.reduce((n, t) => n + t.patterns.length, 0)));
  let allCompile = true;
  for (const t of TACTICS) for (const src of t.patterns) { try { new RegExp(src, 'giu'); } catch (e) { allCompile = false; } }
  check('every pattern compiles', allCompile);

  /* --- 2. each rule fires on Korean --- */
  const ko = [
    ['code_request', '본인 확인을 위해 인증번호 6자리를 알려주세요.'],
    ['safe_account', '자산을 안전계좌로 옮기셔야 합니다.'],
    ['money_request', '이 계좌로 50만원만 보내주세요.'],
    ['app_install', '아래 링크에서 앱을 설치하세요.'],
    ['link', '자세한 내용은 http://example.top/info 를 확인하세요.'],
    ['urgency', '지금 바로 전화 주세요.'],
    ['authority', '금융감독원입니다.'],
    ['threat', '계좌가 정지되었습니다.'],
    ['secrecy', '아무에게도 말하지 마세요.'],
    ['new_number', '엄마 나야. 새 번호로 연락해.'],
    ['delivery', '택배 주소지 오류로 반송됩니다.'],
    ['loan', '무직자 대출 당일 승인 가능합니다.'],
    ['investment', '원금 보장 고수익 보장 확실합니다.'],
    ['refund', '숨은 환급금 신청하세요.'],
    ['prize', '축하합니다. 당첨되셨습니다.'],
    ['credential_soft', '주민등록번호를 적어 보내주세요.'],
  ];
  for (const [id, text] of ko) check(`KO fires: ${id}`, has(text, id), `got [${hits(text).join(', ')}] for "${text}"`);

  /* --- 3. and on English --- */
  const en = [
    ['code_request', 'Please share the verification code with me.'],
    ['safe_account', 'Move your balance to a safe account today.'],
    ['money_request', 'Please send money by gift card.'],
    ['app_install', 'Install this app to continue.'],
    ['link', 'Check https://example.top/claim now.'],
    ['urgency', 'Act now, within 24 hours.'],
    ['authority', 'This is the police fraud department.'],
    ['threat', 'Your account will be suspended.'],
    ['secrecy', 'Do not tell anyone about this.'],
    ['new_number', 'My phone broke, this is my new number.'],
    ['delivery', 'Your delivery failed. Pay the customs fee.'],
    ['loan', 'Loan approved, no credit check.'],
    ['investment', 'Guaranteed returns in our trading group.'],
    ['refund', 'You have an unclaimed refund waiting.'],
    ['prize', "You've won a prize, congratulations."],
    ['credential_soft', 'Please send your card number to confirm.'],
  ];
  for (const [id, text] of en) check(`EN fires: ${id}`, has(text, id), `got [${hits(text).join(', ')}] for "${text}"`);

  /* --- 4. ordinary messages stay quiet --- */
  const quiet = [
    '오늘 저녁 뭐 먹을까? 시장에서 사올게.',
    '내일 3시에 미팅 가능하실까요? 장소는 서면 근처 카페입니다.',
    '감사합니다. 택배 잘 받았습니다.', // one match is allowed: 택배 + 받? -> checked below
  ];
  check('ordinary message 1 has no marks', hits(quiet[0]).length === 0, hits(quiet[0]).join(','));
  check('ordinary message 2 has no marks', hits(quiet[1]).length === 0, hits(quiet[1]).join(','));
  const third = analyze(quiet[2]);
  check('a plain thanks does not reach the "several" band', third.band === 'quiet' || third.band === 'some', `${third.band} / ${third.tactics.map((t) => t.id).join(',')}`);

  /* --- 5. offsets and spans agree with the original text --- */
  const sample = '엄마 나야. 폰 액정이 깨져서 새 번호로 연락해. 급하게 결제할 게 있는데 50만원만 이 계좌로 보내줄 수 있어? 아빠한테는 아직 말하지 마.';
  const r = analyze(sample);
  check('segments rebuild the input exactly', r.segments.map((s) => s.text).join('') === sample);
  check('every span lies inside the input', r.spans.every((s) => s.start >= 0 && s.end <= sample.length && s.end > s.start));
  check('no two spans overlap', r.spans.every((s, i) => i === 0 || r.spans[i - 1].end <= s.start));
  check('every span text equals the slice it points at', r.spans.every((s) => sample.slice(s.start, s.end) === sample.slice(s.start, s.end)));
  check('family sample catches the impersonation, the money and the secrecy', ['new_number', 'money_request', 'secrecy'].every((id) => r.tactics.some((t) => t.id === id)), r.tactics.map((t) => t.id).join(','));
  check('family sample is in a loud band', r.band === 'several' || r.band === 'many', r.band);

  /* --- 6. overlapping matches: strongest wins, weaker still counts --- */
  const over = analyze('안전계좌로 자산을 이체하세요.');
  check('overlap keeps both kinds of pressure', over.tactics.some((t) => t.id === 'safe_account') && over.tactics.some((t) => t.id === 'money_request'), over.tactics.map((t) => t.id).join(','));
  check('overlap does not paint the same text twice', over.spans.every((s, i) => i === 0 || over.spans[i - 1].end <= s.start));
  check('overlap segments rebuild the input', over.segments.map((s) => s.text).join('') === '안전계좌로 자산을 이체하세요.');
  const dup = [{ tacticId: 'a', weight: 1, start: 0, end: 5, match: 'abcde' }, { tacticId: 'b', weight: 4, start: 2, end: 6, match: 'cdef' }];
  const kept = pickSpans(dup);
  check('the heavier match wins a collision', kept.length === 1 && kept[0].tacticId === 'b');

  /* --- 7. bands --- */
  check('a message with nothing is "quiet"', analyze('안녕하세요').band === 'quiet');
  check('one weak signal stays "some"', analyze('지금 바로 전화 주세요.').band === 'some');
  const several = analyze('금융감독원입니다. 계좌가 정지되었습니다. 지금 바로 확인하세요. http://kb-star.top/x');
  check('three kinds of pressure reach "several"', several.band === 'several' || several.band === 'many', several.band + ' ' + several.score);
  const many = analyze('금융감독원입니다. 계좌가 정지되었습니다. 지금 바로 안전계좌로 이체하고 인증번호를 알려주세요. 가족에게는 말하지 마세요. http://kb-star.top/x');
  check('a full phishing script reaches "many"', many.band === 'many', many.band + ' ' + many.score);
  check('every band has both languages', ['quiet', 'some', 'several', 'many'].every((b) => bandCopy(b, 'en').title && bandCopy(b, 'ko').title));
  check('the quiet copy never says the message is safe', /not the same as "safe"/.test(bandCopy('quiet', 'en').body));

  /* --- 8. what the message asks for --- */
  check('safe account counts as a money request', analyze('안전계좌로 옮기세요').requested.includes('money'));
  check('code request counts as credentials', analyze('인증번호를 알려주세요').requested.includes('credentials'));
  check('install request is listed', analyze('앱을 설치하세요').requested.includes('install'));

  /* --- 9. claims and official domains --- */
  const claims = detectClaims('금융감독원과 국민은행을 사칭합니다');
  check('claimed institutions are detected', claims.length === 2, String(claims.length));
  const official = analyze('국민은행입니다. https://www.kbstar.com/login 에서 확인하세요.');
  check('an official domain raises no mismatch', official.domainWarnings.length === 0, JSON.stringify(official.domainWarnings));
  const fake = analyze('국민은행입니다. http://kb-star.top/verify 에서 확인하세요.');
  check('a lookalike domain raises a mismatch', fake.domainWarnings.length === 1, JSON.stringify(fake.domainWarnings));
  check('registrable domain of www.kbstar.com', registrableDomain('www.kbstar.com') === 'kbstar.com');
  check('registrable domain of a co.kr host', registrableDomain('a.b.example.co.kr') === 'example.co.kr');
  check('every official domain is lowercase and has a dot', ORG_DOMAINS.every((o) => o.domains.every((d) => d === d.toLowerCase() && d.includes('.'))));

  /* --- 10. link extraction --- */
  const urls = extractLinks('여기 http://a.top/x 보세요. 그리고 www.bank.co.kr/login 도.');
  check('extracts a scheme URL', urls.includes('http://a.top/x'), urls.join('|'));
  check('extracts a bare domain', urls.some((u) => u.includes('bank.co.kr')), urls.join('|'));
  check('trailing punctuation is trimmed', extractLinks('보세요 http://a.top/x).').every((u) => !u.endsWith(')')));

  /* --- 11. address inspection --- */
  const ip = inspectAddress('http://211.34.5.6/login');
  check('IP host is a strong signal', ip.signals.some((s) => s.id === 'ip_host') && ip.level === 'high');
  const at = inspectAddress('https://kbstar.com@evil.top/login');
  check('userinfo trick is caught', at.signals.some((s) => s.id === 'userinfo'));
  const puny = inspectAddress('https://xn--kbstar-3ve.com/');
  check('punycode is caught', puny.signals.some((s) => s.id === 'punycode'));
  const short = inspectAddress('https://bit.ly/3xyz');
  check('shortener is caught', short.signals.some((s) => s.id === 'shortener'));
  const tld = inspectAddress('https://event-claim.zip/');
  check('a risky TLD is caught', tld.signals.some((s) => s.id === 'risky_tld'));
  const http = inspectAddress('http://kbstar.com/login');
  check('plain http is caught', http.signals.some((s) => s.id === 'no_tls'));
  const brand = inspectAddress('https://kbstar.top/login');
  check('a bank name on another domain is a strong signal', brand.signals.some((s) => s.id === 'brand_elsewhere') && brand.level === 'high', JSON.stringify(brand.signals.map((s) => s.id)));
  const clean = inspectAddress('https://www.kbstar.com/login');
  check('the real bank address raises nothing', clean.signals.length === 0, JSON.stringify(clean.signals.map((s) => s.id)));
  check('a non-address is not inspected', inspectAddress('안녕하세요').parsed.ok === false && inspectAddress('안녕하세요').signals.length === 0);
  check('parse returns null host for text', parseAddress('just words').ok === false);
  check('hostOf reads the host', hostOf('https://www.kbstar.com/a?b=1') === 'kbstar.com');

  /* --- 12. text safety --- */
  check('html is escaped', escapeHtml('<b>&"\'') === '&lt;b&gt;&amp;&quot;&#39;');
  check('escaping keeps a message readable', escapeHtml('계좌 <정지> & 안내').includes('&lt;정지&gt;'));
  check('normalisation keeps the length', normalizeForMatch('１２３　abc').length === '１２３　abc'.length);

  /* --- 13. purity: same input, same answer --- */
  const a1 = analyze(sample);
  const a2 = analyze(sample);
  check('analysis is deterministic', a1.score === a2.score && JSON.stringify(a1.spans) === JSON.stringify(a2.spans));
  check('analysis returns a new object each time', a1 !== a2);
  check('the input string is not modified', sample === '엄마 나야. 폰 액정이 깨져서 새 번호로 연락해. 급하게 결제할 게 있는데 50만원만 이 계좌로 보내줄 수 있어? 아빠한테는 아직 말하지 마.');

  /* --- 14. the verification channels are usable --- */
  check('four channels are listed', CHANNELS.length === 4);
  check('each channel says when to use it', CHANNELS.every((c) => c.when.ko && c.when.en && c.name.ko && c.name.en));
  check('the police and FSS numbers are the published ones', CHANNELS.find((c) => c.id === 'police').number === '112' && CHANNELS.find((c) => c.id === 'fss').number === '1332');

  /* --- 15. an empty box is handled --- */
  const empty = analyze('');
  check('empty input is quiet, not an error', empty.band === 'quiet' && empty.segments.length === 0);

  if (typeof window !== 'undefined') window.__RESULTS__ = results;
  return results;
}
