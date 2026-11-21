/*
 * Address inspection without visiting the address.
 *
 * The page never opens a link from a message: opening it is the risk. It reads
 * the text of the address for shapes that are cheap to fake and hard to hide —
 * an IP address where a name should be, an "@" that redirects, a punycode
 * label, a shortener, a brand name sitting on a domain that is not the brand's.
 */

import { ORG_DOMAINS } from './rules.js';

const SHORTENERS = ['bit.ly', 'bitly.com', 'tinyurl.com', 'goo.gl', 't.co', 'me2.do', 'han.gl', 'vo.la', 'url.kr', 'buly.kr', 'kko.to', 'naver.me', 'is.gd', 'ow.ly', 'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at', 's.id', 'lnk.to'];

const RISKY_TLDS = ['top', 'xyz', 'click', 'zip', 'vip', 'shop', 'site', 'online', 'info', 'biz', 'ru', 'cn', 'cc', 'tk', 'ml', 'ga', 'cf', 'gq', 'support', 'link', 'work', 'rest', 'cyou'];

const BRAND_TOKENS = [];
for (const org of ORG_DOMAINS) {
  for (const d of org.domains) {
    const label = d.split('.').slice(0, -1).join('');
    if (label.length >= 4) BRAND_TOKENS.push({ token: label.replace(/[^a-z0-9]/g, ''), org: org.name, official: org.domains });
  }
}

export function parseAddress(raw) {
  const input = String(raw || '').trim();
  if (!input) return { ok: false, reason: 'empty' };
  let rest = input.split(/\s/)[0];
  let scheme = 'http';
  let hadScheme = false;
  const m = rest.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (m) { scheme = m[1].toLowerCase(); hadScheme = true; rest = rest.slice(m[0].length); }
  const cut = rest.search(/[/?#]/);
  const authority = cut === -1 ? rest : rest.slice(0, cut);
  const tail = cut === -1 ? '' : rest.slice(cut);
  let userinfo = '';
  let hostport = authority;
  const at = authority.lastIndexOf('@');
  if (at !== -1) { userinfo = authority.slice(0, at); hostport = authority.slice(at + 1); }
  let port = '';
  const pm = hostport.match(/^(.*?):(\d{2,5})$/);
  if (pm) { hostport = pm[1]; port = pm[2]; }
  const host = hostport.toLowerCase().replace(/\.$/, '');
  if (!host || (!host.includes('.') && !host.startsWith('['))) return { ok: false, reason: 'no_host', input };
  const q = tail.indexOf('?');
  return {
    ok: true,
    input,
    scheme,
    host,
    path: q === -1 ? tail : tail.slice(0, q),
    query: q === -1 ? '' : tail.slice(q),
    port,
    userinfo,
    hadScheme,
  };
}

export function registrableOf(host) {
  const parts = String(host).toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const sld = ['co', 'or', 'go', 'ne', 'ac', 're', 'pe', 'hs', 'ms', 'es', 'sc'];
  if (sld.includes(parts[parts.length - 2])) return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}

export function inspectAddress(raw) {
  const p = parseAddress(raw);
  if (!p.ok) return { parsed: p, signals: [], level: 'unknown', registrable: null };
  const signals = [];
  const reg = registrableOf(p.host);
  const labels = p.host.split('.');
  const tld = labels[labels.length - 1];
  const regLabel = reg.split('.')[0];

  if (p.scheme === 'http' && p.hadScheme) {
    signals.push({ id: 'no_tls', level: 'medium', label: { en: 'No HTTPS', ko: 'HTTPS 아님' }, why: { en: 'The address is plain http, so the page is not protected in transit. Real login and payment pages use https.', ko: 'http 주소라 전송 구간이 암호화되지 않습니다. 실제 로그인·결제 화면은 https를 씁니다.' } });
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(p.host) || /^\[/.test(p.host)) {
    signals.push({ id: 'ip_host', level: 'high', label: { en: 'IP address instead of a name', ko: '이름 대신 IP 주소' }, why: { en: 'A real service gives you its name. An address that is only numbers has no brand to check and no certificate story to tell.', ko: '정상 서비스는 이름을 씁니다. 숫자만 있는 주소는 확인할 브랜드도, 인증서 이야기도 없습니다.' } });
  }
  if (p.host.includes('@') || p.userinfo) {
    signals.push({ id: 'userinfo', level: 'high', label: { en: 'Text before "@" hides the real host', ko: '"@" 앞 글자가 진짜 주소를 가립니다' }, why: { en: 'Everything before the "@" is ignored by the browser. A page can show a bank name there and still send you to another host.', ko: '브라우저는 "@" 앞부분을 무시합니다. 은행 이름을 앞에 적어 두고도 실제로는 다른 곳으로 보낼 수 있습니다.' } });
  }
  if (labels.some((l) => l.startsWith('xn--'))) {
    signals.push({ id: 'punycode', level: 'high', label: { en: 'Encoded (punycode) name', ko: '인코딩된(punycode) 이름' }, why: { en: 'The name is written in an encoded form that can look identical to a familiar one on screen.', ko: '화면에서는 익숙한 이름과 똑같이 보이도록 인코딩된 주소입니다.' } });
  }
  if (/[^\u0000-\u007f]/.test(p.host)) {
    signals.push({ id: 'non_ascii', level: 'high', label: { en: 'Non-Latin characters in the host', ko: '주소에 비라틴 문자' }, why: { en: 'Hosts that mix scripts are used to imitate a name with letters from another alphabet.', ko: '다른 문자권 글자를 섞어 이름을 흉내 낼 때 쓰입니다.' } });
  }
  if (SHORTENERS.includes(reg)) {
    signals.push({ id: 'shortener', level: 'medium', label: { en: 'Shortened link', ko: '단축 주소' }, why: { en: 'A shortener hides the destination. You cannot judge where this goes from the address itself.', ko: '단축 주소는 목적지를 숨깁니다. 주소만 보고 어디로 가는지 판단할 수 없습니다.' } });
  }
  if (RISKY_TLDS.includes(tld)) {
    signals.push({ id: 'risky_tld', level: 'medium', label: { en: `Domain ends in .${tld}`, ko: `주소가 .${tld}로 끝납니다` }, why: { en: 'Cheap and heavily abused endings. Not proof of anything, but a reason to check the name carefully.', ko: '값이 싸고 남용이 잦은 끝자리입니다. 확실한 증거는 아니지만 이름을 더 꼼꼼히 봐야 할 이유입니다.' } });
  }
  if (labels.length >= 4) {
    signals.push({ id: 'many_labels', level: 'low', label: { en: `${labels.length} name parts`, ko: `이름이 ${labels.length}단` }, why: { en: 'Long chains of subdomains are used to push the real domain out of view on a phone.', ko: '휴대폰에서는 진짜 도메인이 화면 밖으로 밀리도록 하위 이름을 길게 붙입니다.' } });
  }
  if (p.host.length > 40) {
    signals.push({ id: 'long_host', level: 'low', label: { en: 'Very long host name', ko: '주소 이름이 매우 김' }, why: { en: 'Length hides the part that matters; read the last two parts before the slash.', ko: '길면 중요한 부분이 가려집니다. 슬래시 앞 마지막 두 마디를 보세요.' } });
  }
  if (regLabel.includes('-')) {
    signals.push({ id: 'hyphen', level: 'low', label: { en: 'Hyphen in the domain name', ko: '도메인 이름에 하이픈' }, why: { en: 'Brands usually register one word. A hyphen often joins a brand to a word like secure, help, or center.', ko: '브랜드는 보통 한 단어로 등록합니다. 하이픈은 secure·help·center 같은 말을 붙일 때 쓰입니다.' } });
  }
  if (/\d/.test(regLabel)) {
    signals.push({ id: 'digits', level: 'low', label: { en: 'Digits in the domain name', ko: '도메인 이름에 숫자' }, why: { en: 'A digit is often added to make a copied name unique.', ko: '비슷한 이름을 따로 등록하려고 숫자를 붙이는 경우가 많습니다.' } });
  }
  const flat = reg.replace(/[^a-z0-9]/g, '');
  for (const brand of BRAND_TOKENS) {
    const officialHit = brand.official.includes(reg);
    if (!officialHit && flat.includes(brand.token) && brand.token.length >= 5) {
      signals.push({
        id: 'brand_elsewhere',
        level: 'high',
        label: { en: `${brand.org.en} name on a different domain`, ko: `${brand.org.ko} 이름이 다른 주소에` },
        why: {
          en: `The address uses the ${brand.org.en} name but is not ${brand.official.join(' or ')}.`,
          ko: `주소에 ${brand.org.ko} 이름이 들어 있지만 공식 주소(${brand.official.join(', ')})가 아닙니다.`,
        },
      });
      break;
    }
  }
  if (p.port) {
    signals.push({ id: 'port', level: 'low', label: { en: `Unusual port :${p.port}`, ko: `낯선 포트 :${p.port}` }, why: { en: 'Normal web pages do not need a port number in the address.', ko: '일반적인 웹 페이지 주소에는 포트 번호가 붙지 않습니다.' } });
  }

  const level = signals.some((s) => s.level === 'high') ? 'high' : signals.some((s) => s.level === 'medium') ? 'medium' : signals.length ? 'low' : 'none';
  return { parsed: p, signals, level, registrable: reg };
}
