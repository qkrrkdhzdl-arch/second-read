/* Small text helpers shared by the analyser and the page. */

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Normalise only what the matcher needs: full-width forms and runs of spaces.
   Character offsets must stay aligned with the original string, so this
   function deliberately does not change length. */
export function normalizeForMatch(s) {
  return String(s)
    .replace(/\u00a0/g, ' ')       // nbsp -> space (same length)
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/* Collapse whitespace for display in a single line. */
export function oneLine(s, max = 120) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
