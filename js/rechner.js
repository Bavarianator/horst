// F0,5-Rechner: Logik ohne DOM (testbar mit Node), DOM-Code nur in init().
const BETA2 = 0.25; // 0,5² – Precision zählt doppelt

const ratio = (a, b) => (b > 0 ? a / b : null);

// Liefert null statt NaN, wenn ein Wert nicht definiert ist (Division durch 0).
export function scores(tp, fp, fn) {
  const p = ratio(tp, tp + fp);
  const r = ratio(tp, tp + fn);
  // Über die Zähler gerechnet: bleibt auch bei P = R = 0 definiert (dann 0).
  const f = (b2) => ratio((1 + b2) * tp, (1 + b2) * tp + b2 * fn + fp);
  return { p, r, f05: f(BETA2), f1: f(1) };
}

// Kosten (positiv) für eine weitere falsche Korrektur bzw. einen weiteren übersehenen Fehler.
export function marginal(tp, fp, fn) {
  const base = scores(tp, fp, fn).f05;
  const cost = (s) => (base === null || s.f05 === null ? null : base - s.f05);
  return { fp: cost(scores(tp, fp + 1, fn)), fn: cost(scores(tp, fp, fn + 1)) };
}

export const PRESETS = {
  lerner: [42, 15, 58],
  vorsichtig: [20, 2, 80],
  uebereifrig: [80, 60, 20],
  perfekt: [50, 0, 0],
};

const MAX = 200;
const clamp = (v) => (Number.isFinite(v) ? Math.min(MAX, Math.max(0, Math.round(v))) : 0);

function init() {
  const de = (d) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const f2 = de(2), f3 = de(3);
  const fmt = (v, nf = f2) => (v === null ? '–' : nf.format(v));
  const $ = (id) => document.getElementById(id);
  const keys = ['tp', 'fp', 'fn'];
  const num = Object.fromEntries(keys.map((k) => [k, $(`rc-${k}`)]));
  const rng = Object.fromEntries(keys.map((k) => [k, $(`rc-${k}-r`)]));
  const chips = [...document.querySelectorAll('[data-rc-preset]')];
  const metrics = ['p', 'r', 'f05', 'f1'];

  const values = () => keys.map((k) => clamp(Math.round(Number(num[k].value))));

  function render() {
    const [tp, fp, fn] = values();
    const s = scores(tp, fp, fn);
    for (const m of metrics) {
      $(`rc-big-${m}`).textContent = fmt(s[m]);
      $(`rc-val-${m}`).textContent = fmt(s[m]);
      $(`rc-bar-${m}`).style.width = `${(s[m] ?? 0) * 100}%`;
    }
    const sub = (m) => fmt(s[m]);
    $('rc-formula').textContent =
      `Precision = ${tp} / (${tp} + ${fp}) = ${sub('p')}\n` +
      `Recall    = ${tp} / (${tp} + ${fn}) = ${sub('r')}\n` +
      `F0,5 = 1,25 · ${sub('p')} · ${sub('r')}\n` +
      `       / (0,25 · ${sub('p')} + ${sub('r')}) = ${sub('f05')}\n` +
      `F1   = 2 · ${sub('p')} · ${sub('r')}\n` +
      `       / (${sub('p')} + ${sub('r')}) = ${sub('f1')}`;

    const m = marginal(tp, fp, fn);
    let text;
    if (m.fp === null) text = 'Trag mindestens einen Wert größer als 0 ein, dann siehst du hier, was ein weiterer Fehler kostet.';
    else if (tp === 0) text = 'Ohne richtige Korrekturen bleibt F0,5 bei 0 – weitere Fehler ändern daran nichts.';
    else {
      // Drei Stellen: die Kosten sind oft kleiner als 0,01.
      text = `Eine falsche Korrektur mehr kostet hier ${f3.format(m.fp)} F0,5, ein übersehener Fehler mehr nur ${f3.format(m.fn)}.`;
    }
    $('rc-sentence').textContent = text;

    chips.forEach((c) => {
      const p = PRESETS[c.dataset.rcPreset];
      c.setAttribute('aria-pressed', String(p.every((v, i) => v === [tp, fp, fn][i])));
    });
  }

  function set(k, v) {
    num[k].value = rng[k].value = v;
  }

  for (const k of keys) {
    rng[k].addEventListener('input', () => { num[k].value = rng[k].value; render(); });
    num[k].addEventListener('input', () => { rng[k].value = clamp(Math.round(Number(num[k].value))); render(); });
    // Feld erst beim Verlassen normalisieren, damit Tippen nicht stört.
    num[k].addEventListener('change', () => set(k, clamp(Math.round(Number(num[k].value)))));
  }
  chips.forEach((c) => c.addEventListener('click', () => {
    PRESETS[c.dataset.rcPreset].forEach((v, i) => set(keys[i], v));
    render();
  }));

  $('rc-app').hidden = false;
  const ns = $('rc-nojs');
  if (ns) ns.hidden = true;
  PRESETS.lerner.forEach((v, i) => set(keys[i], v));
  render();
}

if (typeof document !== 'undefined') init();
