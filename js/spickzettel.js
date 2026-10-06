// Spickzettel: Filter nach Kategorie und Volltextsuche. Die Seite ist ohne JS vollständig lesbar,
// die Bedienelemente werden erst hier eingeblendet.

// Groß/klein, Akzente, Umlaute und ß tolerant: „Nämlich“, „naemlich“ und „namlich“ werden gleich.
// Beide Seiten werden gleich behandelt, daher schadet es nicht, dass auch „Quelle“ zu „qulle“ wird.
export function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss').replace(/([aou])e/g, '$1').replace(/\s+/g, ' ').trim();
}

// Alle Wörter der Suche müssen vorkommen, in beliebiger Reihenfolge.
export function matches(text, query) {
  const t = normalize(text);
  return normalize(query).split(' ').every((w) => t.includes(w));
}

function init() {
  const tools = document.getElementById('sz-tools');
  const q = document.getElementById('sz-q');
  const count = document.getElementById('sz-count');
  const leer = document.getElementById('sz-leer');
  const chips = [...tools.querySelectorAll('.chip')];
  // Gesucht wird in Titel, Beispiel, Regel und Eselsbrücke, nicht in Kategorie, Linktext und dem
  // Label „Eselsbrücke“ (einziges <span> in den Absätzen). Leerzeichen trennen <del> von <ins>.
  const items = [...document.querySelectorAll('.sz-item')].map((el) => ({
    el,
    text: [...el.querySelectorAll('h3, p')].flatMap((e) => [...e.childNodes])
      .filter((n) => n.nodeName !== 'SPAN').map((n) => n.textContent).join(' '),
  }));
  let kat = 'alle';

  const update = () => {
    let n = 0;
    for (const { el, text } of items) {
      const show = (kat === 'alle' || el.dataset.kat === kat) && matches(text, q.value);
      el.hidden = !show;
      if (show) n++;
    }
    count.textContent = `${n} von ${items.length}`;
    leer.hidden = n > 0;
  };

  for (const c of chips) {
    c.addEventListener('click', () => {
      kat = c.dataset.kat;
      for (const d of chips) d.setAttribute('aria-pressed', String(d === c));
      update();
    });
  }
  q.addEventListener('input', update);
  document.getElementById('sz-print').addEventListener('click', () => window.print());
  tools.hidden = false;
  update();
}

if (typeof document !== 'undefined') init();
