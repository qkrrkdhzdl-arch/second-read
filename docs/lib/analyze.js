/*
 * Second Read — analysis.
 *
 * The analyser does three things and stops there:
 *   1. marks the exact words that match a known pattern,
 *   2. says what each pattern means and what to do instead,
 *   3. counts how many *different* patterns appear and shows them as a band.
 *
 * It never returns "safe". A message with no matches is reported as
 * "no known pattern" — which is a fact about this rule set, not about the message.
 */

import { TACTICS, ORG_DOMAINS } from './rules.js';
import { normalizeForMatch, clamp } from './text.js';

const COMPILED = TACTICS.map((t) => ({
  ...t,
  compiled: t.patterns.map((src) => new RegExp(src, 'giu')),
}));

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const BARE_HOST_RE = /[a-z0-9][a-z0-9-]{1,}\.(?:com|net|kr|co\.kr|or\.kr|go\.kr|io|me|app|link|top|xyz|click|shop|site|online|vip|zip|info|biz|ly|gl|to|cc|ru|cn)(?:\/[^\s<>"']*)?/gi;

export function findMatches(text) {
  const hay = normalizeForMatch(text);
  const out = [];
  for (const tactic of COMPILED) {
    for (const re of tactic.compiled) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(hay)) !== null) {
        if (m[0].length === 0) { re.lastIndex += 1; continue; }
        /* A phone number is not an account number: 010-2345-6789 and
           02-123-4567 have the same shape. Require ten digits or more and
           no mobile prefix before calling it an account number. */
        if (tactic.id === 'account_number') {
          const digits = m[0].replace(/\D/g, '');
          if (digits.length < 10 || /^01/.test(digits)) { continue; }
        }
        out.push({
          tacticId: tactic.id,
          weight: tactic.weight,
          start: m.index,
          end: m.index + m[0].length,
          match: text.slice(m.index, m.index + m[0].length),
        });
      }
    }
  }
  /* "http://kb-star.top/x" also matches the bare-domain rule. The shorter
     match adds nothing, so keep the longer one; the tactic count stays honest. */
  const sorted = out.sort((a, b) => a.start - b.start || b.end - a.end);
  return sorted.filter((m, i) => !sorted.some((o, j) => j !== i && o.tacticId === m.tacticId && o.start <= m.start && o.end >= m.end && (o.end - o.start) > (m.end - m.start)));
}

/* Two matches on the same words (e.g. "안전계좌" inside a money rule) would
   paint the same text twice. Keep the stronger one; the weaker still counts
   toward the tactic total, it just does not get its own highlight. */
export function pickSpans(matches) {
  const kept = [];
  for (const m of [...matches].sort((a, b) => b.weight - a.weight || (b.end - b.start) - (a.end - a.start) || a.start - b.start)) {
    const overlaps = kept.some((k) => m.start < k.end && k.start < m.end);
    if (!overlaps) kept.push(m);
  }
  return kept.sort((a, b) => a.start - b.start);
}

export function buildSegments(text, spans) {
  const segs = [];
  let at = 0;
  for (const s of spans) {
    if (s.start > at) segs.push({ kind: 'text', text: text.slice(at, s.start) });
    segs.push({ kind: 'mark', text: text.slice(s.start, s.end), tacticId: s.tacticId, start: s.start, end: s.end });
    at = s.end;
  }
  if (at < text.length) segs.push({ kind: 'text', text: text.slice(at) });
  return segs;
}

export function extractLinks(text) {
  /* The same address can appear twice — once with a scheme, once without.
     Keep one, keyed by host+path so http://a.top/x and a.top/x collapse. */
  const seen = new Map();
  const add = (raw) => {
    const v = raw.replace(/[),.;!?]+$/, '');
    const key = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '').toLowerCase();
    if (!seen.has(key)) seen.set(key, v);
  };
  for (const m of text.matchAll(URL_RE)) add(m[0]);
  for (const m of text.matchAll(BARE_HOST_RE)) add(m[0]);
  return [...seen.values()];
}

export function detectClaims(text) {
  const found = [];
  for (const org of ORG_DOMAINS) {
    const hit = org.match.find((k) => text.toLowerCase().includes(k.toLowerCase()));
    if (hit) found.push({ id: org.name.en, name: org.name, domains: org.domains, phone: org.phone, keyword: hit });
  }
  return found;
}

/* Registrable part of a host, for comparing against an official domain. */
export function registrableDomain(host) {
  const clean = String(host).toLowerCase().replace(/^\.+|\.+$/g, '');
  const parts = clean.split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const sld = ['co', 'or', 'go', 'ne', 'ac', 're', 'pe', 'hs', 'ms', 'es', 'sc'];
  if (sld.includes(parts[parts.length - 2])) return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}

export function analyze(text, opts = {}) {
  const raw = String(text ?? '');
  const matches = findMatches(raw);
  const spans = pickSpans(matches);
  const byTactic = new Map();
  for (const m of matches) {
    const entry = byTactic.get(m.tacticId) || { id: m.tacticId, count: 0 };
    entry.count += 1;
    byTactic.set(m.tacticId, entry);
  }
  const tactics = [...byTactic.values()]
    .map((e) => {
      const def = TACTICS.find((t) => t.id === e.id);
      return { id: e.id, count: e.count, weight: def.weight, label: def.label, why: def.why, then: def.then, hitNoun: def.hitNoun };
    })
    .sort((a, b) => b.weight - a.weight || b.count - a.count);

  const score = tactics.reduce((s, t) => s + t.weight, 0);
  const band = score === 0 ? 'quiet' : score <= 3 ? 'some' : score <= 7 ? 'several' : 'many';

  const links = extractLinks(raw);
  const claims = detectClaims(raw);

  const requested = [];
  const has = (id) => tactics.some((t) => t.id === id);
  if (has('money_request') || has('safe_account')) requested.push('money');
  if (has('code_request') || has('credential_soft')) requested.push('credentials');
  if (has('app_install')) requested.push('install');
  if (has('link') || links.length) requested.push('link');
  if (has('new_number')) requested.push('reply');

  const domainWarnings = [];
  for (const claim of claims) {
    const tokens = orgTokens(claim);
    for (const url of links) {
      const host = hostOf(url);
      if (!host) continue;
      const reg = registrableDomain(host);
      if (claim.domains.includes(reg)) continue;
      const flat = reg.replace(/[^a-z0-9]/g, '');
      /* A message can name an agency and link to a news article about it.
         Only warn when the address itself wears that name. */
      if (tokens.length && !tokens.some((tk) => flat.includes(tk))) continue;
      domainWarnings.push({ claim: claim.name, url, host, reg, official: claim.domains });
    }
  }

  return {
    input: raw,
    chars: raw.length,
    matches,
    spans,
    segments: buildSegments(raw, spans),
    tactics,
    score,
    band,
    links,
    claims,
    domainWarnings,
    requested,
    ruleCount: TACTICS.length,
    patternCount: TACTICS.reduce((n, t) => n + t.patterns.length, 0),
  };
}

export function orgTokens(claim) {
  const tokens = [];
  for (const d of claim.domains) {
    const label = d.split('.').slice(0, -1).join('').replace(/[^a-z0-9]/g, '');
    if (label.length >= 4 && !tokens.includes(label)) tokens.push(label);
  }
  return tokens;
}

export function hostOf(url) {
  const s = String(url).trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const host = s.split(/[/?#]/)[0].split('@').pop();
  return host && host.includes('.') ? host.toLowerCase() : null;
}

export function bandCopy(band, lang = 'en') {
  const copy = {
    quiet: {
      en: { title: 'No known pattern found', body: 'This rule set found none of the phrases it knows. That is not the same as "safe": a message can be a scam and still read plainly. If money, a code, or an install is involved, check it through an official channel anyway.' },
      ko: { title: '아는 패턴이 없습니다', body: '이 규칙이 아는 문구가 하나도 나오지 않았습니다. "안전하다"는 뜻이 아닙니다. 사기는 평범한 문장으로도 옵니다. 돈·인증번호·설치가 걸려 있다면 공식 경로로 확인하세요.' },
    },
    some: {
      en: { title: 'A few signals', body: 'One or two things in this message match known scam shapes. On their own they can be innocent — read the explanations, then decide whether the message earns a second look.' },
      ko: { title: '신호가 조금 있습니다', body: '알려진 사기 형태와 겹치는 부분이 한두 군데 있습니다. 그것만으로 사기라고 단정할 수는 없습니다. 설명을 읽고 한 번 더 확인할지 정하세요.' },
    },
    several: {
      en: { title: 'Several signals at once', body: 'Different kinds of pressure appear together — the combination is what makes it work, and it is worth stopping before you reply.' },
      ko: { title: '여러 신호가 겹칩니다', body: '서로 다른 압박이 함께 나옵니다. 이 조합이 사람을 움직이게 만드는 장치입니다. 답하기 전에 멈추세요.' },
    },
    many: {
      en: { title: 'Many signals at once', body: 'This message uses most of the shapes we look for. Treat it as hostile until an official channel says otherwise, and do not reply to it.' },
      ko: { title: '신호가 아주 많습니다', body: '이 메시지는 우리가 찾는 형태를 대부분 사용합니다. 공식 경로에서 확인되기 전까지는 위험한 메시지로 다루고, 답장하지 마세요.' },
    },
  };
  return copy[band][lang] || copy[band].en;
}
