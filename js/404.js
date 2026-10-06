// 404: HORST korrigiert die Adresse. Logik DOM-frei, damit sie sich in Node testen lässt.
export const PAGES = [
  ['index', 'Startseite'], ['funktionsweise', 'Funktionsweise'], ['modell', 'Das Modell'],
  ['training', 'Training'], ['daten', 'Daten'], ['benchmark', 'Benchmark'], ['news', 'News'],
  ['fahrplan', 'Fahrplan'], ['entwickler', 'Für Entwickler'], ['faq', 'FAQ und Glossar'],
  ['testraum', 'Testraum'], ['duell', 'Korrektur-Duell'], ['spickzettel', 'Spickzettel'], ['marke', 'Marke'],
].map(([slug, title]) => ({ slug, title }));

export function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// raw=true: Schreibweise wie in der URL (für die Anzeige); sonst kleingeschrieben (für den Vergleich)
export function slugFromPath(path, raw = false) {
  const last = String(path).replace(/^\/horst(\/|$)/i, '').replace(/\/+$/, '').split('/').pop();
  let s = last;
  try { s = decodeURIComponent(last); } catch { /* kaputter %-Code: roh weiterverwenden */ }
  s = s.replace(/\.html$/i, '');
  return raw ? s : s.toLowerCase();
}

export function suggest(slug, pages = PAGES) {
  if (!slug) return null;
  let best = null;
  for (const page of pages) {
    const dist = levenshtein(slug, page.slug);
    if (!best || dist < best.dist) best = { page, dist };
  }
  return best && best.dist <= Math.max(2, Math.floor(slug.length / 3)) ? best : null;
}

function init() {
  const slug = slugFromPath(location.pathname);
  const hit = suggest(slug);
  const box = document.getElementById('vorschlag');
  if (!box) return;
  const lbl = box.querySelector('.lbl');
  box.replaceChildren(lbl);
  if (!hit) {
    box.append('Dazu fällt selbst HORST nichts ein.');
    return;
  }
  const del = document.createElement('del');
  del.textContent = slugFromPath(location.pathname, true);
  const ins = document.createElement('ins');
  ins.textContent = hit.page.slug;
  box.append('/horst/', del, ins);
  const a = document.createElement('a');
  a.className = 'btn btn-red';
  a.style.cssText = 'margin-top: 24px; min-height: 60px; font-size: 18px';
  a.href = hit.page.slug === 'index' ? './' : hit.page.slug + '.html';
  a.textContent = 'Weiter zu ' + hit.page.title;
  box.after(a);
}

if (typeof document !== 'undefined') init();
