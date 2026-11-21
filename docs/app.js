import { analyze, bandCopy, hostOf } from './lib/analyze.js';
import { inspectAddress } from './lib/link.js';
import { CHANNELS } from './lib/rules.js';
import { escapeHtml } from './lib/text.js';

/* ---------- language ---------- */

const params = new URLSearchParams(location.search);
let LANG = params.get('lang') === 'ko' ? 'ko' : params.get('lang') === 'en' ? 'en' : (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';

const UI = {
  tagline: { en: 'Read a suspicious message twice before you act.', ko: '행동하기 전에, 의심스러운 문자를 두 번 읽으세요.' },
  lede: {
    en: 'Paste the message. It never leaves this page — no account, no upload, no network call. You get the exact words that scammers use, what each one is doing, and how to check the message without touching anything inside it.',
    ko: '문자를 붙여 넣으세요. 이 페이지 밖으로 나가지 않습니다 — 계정도, 업로드도, 통신도 없습니다. 사기 문자에 쓰이는 말이 어디에 있는지, 그 말이 무슨 일을 하는지, 문자 안의 것은 건드리지 않고 어떻게 확인하는지 보여드립니다.',
  },
  pasteLabel: { en: 'The message', ko: '문자 내용' },
  placeholder: { en: 'Paste the text message here…', ko: '확인할 문자를 여기에 붙여 넣으세요…' },
  read: { en: 'Read it', ko: '읽어보기' },
  clear: { en: 'Clear', ko: '지우기' },
  samples: { en: 'Samples:', ko: '예시:' },
  fine: { en: 'Nothing is saved. Closing the tab clears the message.', ko: '아무것도 저장하지 않습니다. 탭을 닫으면 내용이 사라집니다.' },
  how: { en: 'How it works', ko: '어떻게 동작하나' },
  skip: { en: 'Skip to the message box', ko: '문자 입력란으로 건너뛰기' },
  howTitle: { en: 'How it works, and what it cannot do', ko: '어떻게 동작하고, 무엇은 못 하는지' },
  how1: {
    en: 'It matches words, not meaning. Every mark below is a phrase in a rule set built from published scam warnings — impersonated agencies, "safe accounts", code requests, family impersonation, fake parcel notices, upfront-fee loans, private trading rooms, unclaimed refunds.',
    ko: '뜻이 아니라 말을 찾습니다. 표시된 곳은 모두, 공개된 사기 경고에서 뽑은 문구입니다 — 기관 사칭, 안전계좌, 인증번호 요구, 가족 사칭, 택배 사칭, 선입금 대출, 리딩방, 환급금.',
  },
  how2: { en: 'It counts different kinds of pressure, not how bad a message is. A message with no marks is "no known pattern", never "safe".', ko: '얼마나 나쁜지가 아니라, 서로 다른 압박이 몇 가지인지 셉니다. 표시가 없는 문자는 "아는 패턴 없음"이지 "안전"이 아닙니다.' },
  how3: { en: 'It reads an address\' shape without opening it: IP hosts, an "@" that hides the real host, punycode, shorteners, a bank\'s name sitting on a domain that is not the bank\'s.', ko: '주소를 열지 않고 모양만 봅니다: IP 주소, 진짜 주소를 가리는 "@", punycode, 단축 주소, 은행 이름을 달았지만 은행 주소가 아닌 도메인.' },
  how4: { en: 'It does not know your bank, your family, or whether a link is live. It cannot see images or PDFs, and it does not read beyond the phrases listed.', ko: '고객님의 은행·가족·링크의 생존 여부는 모릅니다. 이미지나 PDF는 읽지 못하고, 목록에 있는 문구 밖은 판단하지 않습니다.' },
  how5: { en: 'No account, no server, no analytics. The page loads once and works offline; check the source on GitHub and watch the network tab stay empty.', ko: '계정도, 서버도, 분석도 없습니다. 한 번 불러오면 오프라인에서도 동작합니다. GitHub에서 소스를 보고, 네트워크 탭이 비어 있는지 확인해 보세요.' },
  footer: {
    en: 'Second Read is a prototype, not an emergency service. If money has already left your account, call 112 (police) or 1332 (Financial Supervisory Service) — the numbers printed on those organisations\' own websites.',
    ko: 'Second Read는 시제품이며 긴급 서비스가 아닙니다. 이미 돈이 빠져나갔다면 112(경찰) 또는 1332(금융감독원)로 전화하세요 — 각 기관 홈페이지에 적힌 번호입니다.',
  },
  built: { en: 'Built for SafeSpace Hacks, 2026.', ko: 'SafeSpace Hacks 2026 출품작.' },
  tests: { en: 'Tests', ko: '테스트' },

  band: { en: 'Reading', ko: '판독 결과' },
  marked: { en: 'The message, marked', ko: '표시한 문자' },
  markedLead: { en: 'The same text you pasted, with the phrases that carry the pressure underlined. Nothing has been rewritten.', ko: '붙여 넣은 그대로입니다. 압박을 만드는 문구에만 표시를 했습니다. 문장은 고치지 않았습니다.' },
  findings: { en: 'What each mark is doing', ko: '각 표시가 하는 일' },
  askedFor: { en: 'What it asks you to do', ko: '이 문자가 요구하는 것' },
  address: { en: 'Address check — without opening it', ko: '주소 검사 — 열지 않고' },
  addressClean: { en: 'No shape-level signal in this address. That does not make it safe: a clean address can point at a clean-looking copy of a login page.', ko: '이 주소에서는 모양 단계의 신호가 나오지 않았습니다. 안전하다는 뜻은 아닙니다. 깨끗한 주소도 로그인 화면을 똑같이 베낀 곳을 가리킬 수 있습니다.' },
  verify: { en: 'Check it through a channel the message cannot touch', ko: '이 문자가 건드릴 수 없는 경로로 확인하기' },
  verifyLead: { en: 'Use the number or app you already have — not the one in the message. When you call, say you are calling them directly.', ko: '문자에 적힌 번호가 아니라, 이미 알고 있는 번호나 앱으로 확인하세요. 전화하면 직접 건 전화라고 먼저 말하세요.' },
  script: { en: 'What to say on the call', ko: '전화에서 할 말' },
  now: { en: 'If money has already left', ko: '이미 돈이 빠져나갔다면' },
  nowBody: {
    en: 'Call 112 and your bank\'s main number now. Ask the bank to freeze the receiving account and file a 지급정지 request; the sooner it is filed, the more can be recovered. Keep the message — do not delete it, and do not reply to it.',
    ko: '지금 112와 거래 은행 대표번호로 전화하세요. 받는 계좌 지급정지와 사고 신고를 요청하세요. 신고가 빠를수록 회수 가능성이 높습니다. 문자는 지우지 말고, 답장하지 마세요.',
  },
  limits: { en: 'Limits of this reading', ko: '이 판독의 한계' },
  copy: { en: 'Copy summary', ko: '요약 복사' },
  copied: { en: 'Copied', ko: '복사됨' },
  print: { en: 'Print the card', ko: '카드 인쇄' },
  cardTitle: { en: 'Keep this on the fridge', ko: '냉장고에 붙여두세요' },
  never: { en: 'Three things to never do on a call or in a reply', ko: '전화·답장에서 절대 하지 않을 세 가지' },
  never1: { en: 'Never read out a code that arrived by text.', ko: '문자로 온 인증번호를 읽어주지 않는다.' },
  never2: { en: 'Never move money to a "safe account". There is no such account.', ko: '"안전계좌"로 돈을 옮기지 않는다. 그런 계좌는 없다.' },
  never3: { en: 'Never install an app or remote-support tool a stranger sent.', ko: '모르는 사람이 보낸 앱·원격제어 프로그램을 설치하지 않는다.' },
  ask1: { en: '"I am calling you directly. Can you tell me what transactions actually went through on my account?"', ko: '"제가 직접 건 전화입니다. 제 계좌에 실제로 어떤 거래가 있었는지 알려주세요."' },
  ask2: { en: '"Is there any freeze or report filed under my name?"', ko: '"제 이름으로 지급정지나 신고가 들어온 게 있나요?"' },
  ask3: { en: '"What should I do next — and please tell me the number I should call back on your official site."', ko: '"다음에 무엇을 해야 하나요? 다시 연락할 번호를 홈페이지에 적힌 번호로 알려주세요."' },
  officialFor: { en: 'Named in the message', ko: '문자에 나온 기관' },
  officialSite: { en: 'official', ko: '공식' },
  mismatch: { en: 'The address uses this name but is not the official domain.', ko: '이 이름을 달았지만 공식 도메인이 아닙니다.' },
  count: { en: 'kinds of pressure', ko: '가지 압박' },
  marks: { en: 'marks', ko: '곳 표시' },
  ruleset: { en: 'rule set', ko: '규칙' },
  reqMoney: { en: 'send money', ko: '돈 보내기' },
  reqCredentials: { en: 'share a code or personal number', ko: '인증번호·개인번호 알려주기' },
  reqInstall: { en: 'install something', ko: '무언가 설치하기' },
  reqLink: { en: 'open a link', ko: '링크 열기' },
  reqReply: { en: 'reply on a new number', ko: '새 번호로 답장하기' },
  emptyWarn: { en: 'Paste a message first.', ko: '먼저 문자를 붙여 넣어 주세요.' },
  quietNote: { en: 'No known pattern is not a clean bill of health.', ko: '아는 패턴이 없다는 것이 안전하다는 뜻은 아닙니다.' },
  whyLabel: { en: 'Why it matters', ko: '왜 중요한가' },
  thenLabel: { en: 'Do this instead', ko: '대신 이렇게' },
};

const t = (k) => (UI[k] ? UI[k][LANG] : k);
const tt = (obj) => (obj ? obj[LANG] || obj.en : '');

/* ---------- samples ---------- */

const SAMPLES = {
  authority: '[금융감독원] 고객님의 계좌가 이상거래로 정지되었습니다. 24시간 내 확인하지 않으면 압류됩니다. 아래 링크에서 본인 확인 후 안전계좌로 자산을 이체하세요. http://kb-star.top/verify?id=88 담당자 010-2345-6789 (인증번호 6자리를 알려주시면 바로 처리됩니다)',
  family: '엄마 나야. 폰 액정이 깨져서 새 번호로 연락해. 급하게 결제할 게 있는데 50만원만 이 계좌로 보내줄 수 있어? 아빠한테는 아직 말하지 마. 국민은행 123456-01-234567',
  ordinary: '가온님, 내일 3시에 미팅 가능하실까요? 장소는 서면 근처 카페로 하면 좋을 것 같습니다. 일정 되시면 알려주세요.',
};

/* ---------- render ---------- */

const out = document.getElementById('out');
const msg = document.getElementById('msg');

function levelBadge(level) {
  const map = {
    high: { en: 'strong', ko: '강한 신호' },
    medium: { en: 'medium', ko: '중간 신호' },
    low: { en: 'weak', ko: '약한 신호' },
    none: { en: 'none found', ko: '신호 없음' },
    unknown: { en: 'not an address', ko: '주소 아님' },
  };
  return `<span class="badge ${level}">${escapeHtml((map[level] || map.none)[LANG])}</span>`;
}

function renderQuotes(result, tacticId) {
  const quotes = [];
  for (const m of result.matches) {
    if (m.tacticId !== tacticId) continue;
    const text = m.match.replace(/\s+/g, ' ').trim();
    if (text && !quotes.includes(text)) quotes.push(text);
  }
  return quotes.slice(0, 3);
}

function renderMarked(result) {
  return result.segments
    .map((s) => (s.kind === 'text' ? escapeHtml(s.text) : `<mark class="w${s.tacticId === 'authority' || s.tacticId === 'urgency' ? 'weak' : 'strong'}" title="${escapeHtml(s.tacticId)}">${escapeHtml(s.text)}</mark>`))
    .join('');
}

function renderAddresses(result) {
  if (!result.links.length) return '';
  const blocks = result.links.map((url) => {
    const info = inspectAddress(url);
    const host = info.parsed.ok ? info.parsed.host : url;
    const signals = info.signals.length
      ? `<ul class="signals">${info.signals.map((s) => `<li><span class="dot ${s.level}"></span><b>${escapeHtml(tt(s.label))}</b><span>${escapeHtml(tt(s.why))}</span></li>`).join('')}</ul>`
      : `<p class="fine">${escapeHtml(t('addressClean'))}</p>`;
    return `<article class="addr">
      <header><code>${escapeHtml(host)}</code> ${levelBadge(info.level)}</header>
      <p class="fine">${escapeHtml(url)}</p>
      ${signals}
    </article>`;
  });
  return `<section class="block"><h3>${escapeHtml(t('address'))}</h3>${blocks.join('')}</section>`;
}

function renderClaims(result) {
  if (!result.claims.length) return '';
  const rows = result.claims.map((c) => {
    const warn = result.domainWarnings.find((w) => w.claim.en === c.id);
    return `<li><b>${escapeHtml(tt(c.name))}</b> — ${escapeHtml(t('officialSite'))}: <code>${escapeHtml(c.domains.join(', '))}</code>${c.phone ? ` · ${escapeHtml(c.phone)}` : ''}${warn ? `<div class="warn">${escapeHtml(t('mismatch'))} <code>${escapeHtml(warn.host)}</code></div>` : ''}</li>`;
  });
  return `<section class="block"><h3>${escapeHtml(t('officialFor'))}</h3><ul class="claims">${rows.join('')}</ul></section>`;
}

function renderVerify() {
  const rows = CHANNELS.map((c) => `<li><b>${escapeHtml(tt(c.name))}</b> — ${escapeHtml(tt(c.when))}</li>`).join('');
  const script = [t('ask1'), t('ask2'), t('ask3')].map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  return `<section class="block verify">
    <h3>${escapeHtml(t('verify'))}</h3>
    <p>${escapeHtml(t('verifyLead'))}</p>
    <ul class="channels">${rows}</ul>
    <h4>${escapeHtml(t('script'))}</h4>
    <ol class="script">${script}</ol>
  </section>`;
}

function renderCard() {
  return '';
}

export function renderResult(result) {
  if (!result || !result.input.trim()) {
    out.innerHTML = `<p class="pill warnline">${escapeHtml(t('emptyWarn'))}</p>`;
    return;
  }
  const copy = bandCopy(result.band, LANG);
  const reqChips = result.requested.map((r) => `<span class="chip static">${escapeHtml(t({ money: 'reqMoney', credentials: 'reqCredentials', install: 'reqInstall', link: 'reqLink', reply: 'reqReply' }[r]))}</span>`).join('');

  const findings = result.tactics.map((tac, i) => {
    const quotes = renderQuotes(result, tac.id);
    const q = quotes.map((x) => `<q>${escapeHtml(x)}</q>`).join(' ');
    return `<li id="f${i}">
      <div class="fhead"><span class="num">${i + 1}</span><h4>${escapeHtml(tt(tac.label))}</h4>${tac.count > 1 ? `<span class="count">×${tac.count}</span>` : ''}</div>
      ${q ? `<p class="quotes">${q}</p>` : ''}
      <p class="why"><b>${escapeHtml(t('whyLabel'))}</b> ${escapeHtml(tt(tac.why))}</p>
      <p class="then"><b>${escapeHtml(t('thenLabel'))}</b> ${escapeHtml(tt(tac.then))}</p>
    </li>`;
  }).join('');

  const meta = LANG === 'ko'
    ? `${result.tactics.length}가지 압박 · ${result.matches.length}곳 표시 · 규칙 ${result.ruleCount}종 / 문구 ${result.patternCount}개`
    : `${result.tactics.length} kinds of pressure · ${result.matches.length} marks · rule set: ${result.ruleCount} rules / ${result.patternCount} phrases`;

  out.innerHTML = `
  <section class="verdict band-${result.band}">
    <p class="kicker">${escapeHtml(t('band'))}</p>
    <h2>${escapeHtml(copy.title)}</h2>
    <p>${escapeHtml(copy.body)}</p>
    ${reqChips ? `<div class="reqs">${reqChips}</div>` : ''}
    <p class="meta">${escapeHtml(meta)}</p>
  </section>

  <section class="block">
    <h3>${escapeHtml(t('marked'))}</h3>
    <p class="fine">${escapeHtml(t('markedLead'))}</p>
    <div class="marked" id="marked">${renderMarked(result)}</div>
  </section>

  ${findings ? `<section class="block"><h3>${escapeHtml(t('findings'))}</h3><ol class="findings">${findings}</ol></section>` : ''}

  ${renderAddresses(result)}
  ${renderClaims(result)}
  ${renderVerify()}

  <section class="block now">
    <h3>${escapeHtml(t('now'))}</h3>
    <p>${escapeHtml(t('nowBody'))}</p>
  </section>

  <section class="block card-print" id="card">
    <h3>${escapeHtml(t('cardTitle'))}</h3>
    <p class="kicker">${escapeHtml(t('never'))}</p>
    <ol class="never"><li>${escapeHtml(t('never1'))}</li><li>${escapeHtml(t('never2'))}</li><li>${escapeHtml(t('never3'))}</li></ol>
    <p class="nums">112 · 1332 · 118</p>
  </section>

  <section class="block limits">
    <h3>${escapeHtml(t('limits'))}</h3>
    <ul>
      <li>${escapeHtml(t('how2'))}</li>
      <li>${escapeHtml(t('how4'))}</li>
      <li>${escapeHtml(t('quietNote'))}</li>
    </ul>
    <div class="row">
      <button id="copy" class="ghost" type="button">${escapeHtml(t('copy'))}</button>
      <button id="print" class="ghost" type="button">${escapeHtml(t('print'))}</button>
    </div>
  </section>`;

  const copyBtn = document.getElementById('copy');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const lines = [`${copy.title} (${result.tactics.length} ${t('count')})`, ...result.tactics.map((x, i) => `${i + 1}. ${tt(x.label)}`)];
    try { await navigator.clipboard.writeText(lines.join('\n')); copyBtn.textContent = t('copied'); } catch { copyBtn.textContent = copy.title; }
  });
  const printBtn = document.getElementById('print');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
}

/* ---------- wiring ---------- */

let lastResult = null;

function run() {
  lastResult = analyze(msg.value);
  renderResult(lastResult);
  document.getElementById('marked')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('run').addEventListener('click', run);
document.getElementById('clear').addEventListener('click', () => {
  msg.value = '';
  out.innerHTML = '';
  msg.focus();
});
msg.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run();
});
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', () => {
    const key = b.getAttribute('data-sample');
    msg.value = SAMPLES[key];
    run();
  });
});

/* Apply the language to the static page. */
function applyLang() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  const langBtn = document.getElementById('lang');
  langBtn.textContent = LANG === 'en' ? '한국어' : 'English';
  if (lastResult) renderResult(lastResult);
}

document.getElementById('lang').addEventListener('click', () => {
  LANG = LANG === 'en' ? 'ko' : 'en';
  applyLang();
});

applyLang();

/* Expose for the test page. */
if (typeof window !== 'undefined') {
  window.SecondRead = { run, analyze, renderResult, getLANG: () => LANG, setLANG: (l) => { LANG = l; applyLang(); } };
}
