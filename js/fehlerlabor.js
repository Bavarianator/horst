// Fehlerlabor: baut gezielt Fehler in einen sauberen Satz ein. DOM-frei, damit Node es testen kann.
import { tokenize } from './diff.js';

export const TYPE_NAMES = {
  tipp: 'Tippfehler', umlaut: 'Umlaute und ß', verwechslung: 'Verwechslungen', gross: 'Groß/klein', komma: 'Kommas',
};
export const TYPES = Object.keys(TYPE_NAMES);

export const SENTENCES = [
  'Ich weiß nicht, ob wir das Paket schon morgen bekommen.',
  'Seit dem Umzug fährt meine Schwester jeden Morgen mit dem Fahrrad zur Arbeit.',
  'Wir hoffen, dass das Wetter am Wochenende wieder besser wird.',
  'Vielleicht sollten wir die Besprechung auf nächsten Dienstag verschieben.',
  'Der Bäcker an der Ecke verkauft das beste Brot der ganzen Straße.',
  'Ihr seid herzlich eingeladen, wenn wir im Sommer unseren Garten einweihen.',
  'Nachdem sie den Brief gelesen hatte, rief sie ihre Großmutter an.',
  'Die Ergebnisse waren eigentlich ganz gut, nur die Präsentation war zu lang.',
  'Er hat ihm nämlich versprochen, dass er pünktlich um acht Uhr kommt.',
  'Das neue Gerät ist ziemlich teuer, aber es spart im Alltag viel Zeit.',
  'Kannst du mir bitte sagen, wo ich den Schlüssel für den Keller finde?',
];

// Deterministischer Zufall für Tests
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const positions = (n, ok) => [...Array(Math.max(0, n)).keys()].filter(ok);

const ROWS = ['qwertzuiopü', 'asdfghjklöä', 'yxcvbnm'];
function near(c) {
  const lc = c.toLowerCase();
  const row = ROWS.find((r) => r.includes(lc));
  if (!row) return [];
  const i = row.indexOf(lc);
  const opts = [row[i - 1], row[i + 1]].filter(Boolean);
  return c === lc ? opts : opts.map((x) => x.toUpperCase());
}

// Tippfehler-Varianten; null = an diesem Wort nicht möglich. Erster Buchstabe bleibt beim Vertauschen und Weglassen stehen.
const TYPOS = [
  (w, rng) => {
    const i = pick(positions(w.length, (k) => near(w[k]).length > 0), rng);
    return i === undefined ? null : w.slice(0, i) + pick(near(w[i]), rng) + w.slice(i + 1);
  },
  (w, rng) => {
    const i = pick(positions(w.length - 1, (k) => k > 0 && w[k] !== w[k + 1]), rng);
    return i === undefined ? null : w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
  },
  (w, rng) => {
    const i = 1 + Math.floor(rng() * (w.length - 1));
    return w.slice(0, i) + w.slice(i + 1);
  },
  (w, rng) => {
    const i = Math.floor(rng() * w.length);
    return w.slice(0, i) + w[i] + w.slice(i);
  },
];

const UMLAUTS = { ä: ['ae', 'a'], ö: ['oe', 'o'], ü: ['ue', 'u'], Ä: ['Ae', 'A'], Ö: ['Oe', 'O'], Ü: ['Ue', 'U'], ß: ['ss'] };

const CONFUSIONS = {
  dass: 'das', das: 'dass', seit: 'seid', seid: 'seit', wieder: 'wider', wider: 'wieder', nämlich: 'nähmlich',
  standard: 'standart', vielleicht: 'vieleicht', ihm: 'im', ihn: 'in', wahr: 'war', war: 'wahr', ziemlich: 'zimlich',
  eigentlich: 'eigendlich', endgültig: 'entgültig', interessant: 'interresant', paket: 'packet', ergebnis: 'ergebniss',
  maschine: 'maschiene', rhythmus: 'rythmus', wäre: 'währe', nimmt: 'nimt', spazieren: 'spatzieren',
};

const isUpper = (c) => c !== c.toLowerCase();

const BREAKERS = {
  tipp: {
    fits: (t) => /^\p{L}{3,}$/u.test(t),
    apply(t, rng) {
      const start = Math.floor(rng() * TYPOS.length);
      for (let k = 0; k < TYPOS.length; k++) {
        const out = TYPOS[(start + k) % TYPOS.length](t, rng);
        if (out && out !== t) return out;
      }
      return t + t[t.length - 1]; // Verdoppeln geht immer
    },
  },
  umlaut: {
    fits: (t) => /[äöüÄÖÜß]/.test(t),
    apply(t, rng) {
      const i = pick(positions(t.length, (k) => t[k] in UMLAUTS), rng);
      return t.slice(0, i) + pick(UMLAUTS[t[i]], rng) + t.slice(i + 1);
    },
  },
  verwechslung: {
    fits: (t) => Object.hasOwn(CONFUSIONS, t.toLowerCase()),
    apply(t) {
      const v = CONFUSIONS[t.toLowerCase()];
      return isUpper(t[0]) ? v[0].toUpperCase() + v.slice(1) : v;
    },
  },
  gross: {
    fits: (t) => /^\p{Lu}\p{Ll}*$/u.test(t),
    apply: (t) => t[0].toLowerCase() + t.slice(1),
  },
  komma: {
    fits: (t) => t === ',',
    apply: () => '',
  },
};

// Baut bis zu `count` Fehler ein, jedes Token höchstens einmal. applied: [{type, from, to, at}] mit at = Token-Index.
export function breakSentence(text, { types = TYPES, count = 2, rng = Math.random } = {}) {
  const toks = tokenize(text);
  const kinds = types.filter((t) => BREAKERS[t]);
  const used = new Set();
  const applied = [];
  for (let n = 0; n < count && kinds.length; n++) {
    const start = Math.floor(rng() * kinds.length);
    let done = false;
    for (let k = 0; k < kinds.length && !done; k++) {
      const type = kinds[(start + k) % kinds.length];
      const at = pick(positions(toks.length, (i) => !used.has(i) && BREAKERS[type].fits(toks[i])), rng);
      if (at === undefined) continue;
      const from = toks[at];
      toks[at] = BREAKERS[type].apply(from, rng);
      used.add(at);
      applied.push({ type, from, to: toks[at], at });
      done = true;
    }
    if (!done) break; // keine passende Stelle mehr
  }
  return { text: toks.join(''), applied };
}
