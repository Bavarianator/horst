// Testraum: eigenen Text über den HORST-Demo-Space korrigieren lassen, dazu das Fehlerlabor.
// Kein Netzwerkzugriff beim Laden: der Status wird erst bei der ersten Interaktion abgefragt.
import { wordDiff, countEdits, renderDiff } from './diff.js';
import { breakSentence, SENTENCES, TYPE_NAMES } from './fehlerlabor.js';

const API = 'https://bayernator-horst.hf.space/gradio_api/call/correct';
const STATUS_API = 'https://huggingface.co/api/spaces/Bayernator/HORST';
const DEMO = 'https://huggingface.co/spaces/Bayernator/HORST';
const MAX_WORDS = 500;
const TIMEOUT_MS = 120000;

// Server-Sent Events → [{event, data}]; data als JSON, sonst Rohtext, ohne data-Zeile null
export function parseSSE(text) {
  const out = [];
  for (const block of text.replace(/\r\n?/g, '\n').split(/\n{2,}/)) {
    let event = null;
    const data = [];
    for (const line of block.split('\n')) {
      const m = /^(event|data):\s?(.*)$/.exec(line);
      if (m && m[1] === 'event') event = m[2];
      else if (m) data.push(m[2]);
    }
    if (event === null && !data.length) continue;
    let d = null;
    if (data.length) {
      try { d = JSON.parse(data.join('\n')); } catch { d = data.join('\n'); }
    }
    out.push({ event: event ?? 'message', data: d });
  }
  return out;
}

class DemoError extends Error {
  constructor(kind, detail = '') {
    super(kind);
    this.kind = kind;
    this.detail = detail;
  }
}

// 429/503: Kontingent erschöpft oder überlastet; alles andere gilt als Verbindungsproblem
const httpKind = (status) => (status === 429 || status === 503 ? 'api' : 'net');

// Fehlerdaten der Demo als Text; null bleibt leer (dann greift die allgemeine Meldung)
function errorText(d) {
  if (d == null) return '';
  const v = typeof d === 'object' && !Array.isArray(d) ? d.error ?? d.message ?? d : d;
  return typeof v === 'string' ? v : JSON.stringify(v);
}

// Gradio-Aufruf in zwei Schritten: Auftrag anlegen, dann den Ereignisstrom bis „complete“ oder „error“ lesen
export async function correctViaDemo(text, beam, signal) {
  const r = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [text, beam] }), signal,
  });
  if (!r.ok) throw new DemoError(httpKind(r.status));
  const { event_id: id } = await r.json();
  if (!id) throw new DemoError('api');
  const s = await fetch(`${API}/${encodeURIComponent(id)}`, { signal });
  if (!s.ok || !s.body) throw new DemoError(httpKind(s.status));
  const reader = s.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    // CRLF und einzelnes CR zu LF; ein CR am Pufferende wartet auf das nächste Stück (könnte zu CRLF gehören)
    buf = (buf + dec.decode(value, { stream: !done })).replace(/\r\n|\r(?!$)/g, '\n');
    // Nur vollständige Blöcke auswerten, solange der Strom noch läuft
    for (const e of parseSSE(done ? buf : buf.slice(0, buf.lastIndexOf('\n\n') + 1))) {
      if (e.event !== 'complete' && e.event !== 'error') continue;
      reader.cancel();
      if (e.event === 'complete' && Array.isArray(e.data) && typeof e.data[0] === 'string') return e.data[0];
      throw new DemoError('api', errorText(e.data));
    }
    if (done) throw new DemoError('api');
  }
}

const STAGES = {
  RUNNING: ['ok', 'Demo läuft'],
  RUNNING_BUILDING: ['ok', 'Demo läuft'],
  SLEEPING: ['warn', 'Demo schläft – der erste Aufruf weckt sie (ca. eine Minute)'],
  BUILDING: ['warn', 'Demo startet gerade'],
  APP_STARTING: ['warn', 'Demo startet gerade'],
  RUNNING_APP_STARTING: ['warn', 'Demo startet gerade'],
  PAUSED: ['err', 'Demo ist pausiert'],
};

const MESSAGES = {
  empty: 'Das Textfeld ist leer. Gib einen Satz ein oder nimm eines der Beispiele.',
  net: 'Die Demo ist gerade nicht erreichbar. Prüf deine Internetverbindung und versuch es gleich noch einmal.',
  sleep: 'Die Demo schläft und wird durch den Aufruf geweckt. Das dauert etwa eine Minute – dann noch einmal auf „Korrigieren“ klicken.',
  api: 'Die Demo hat die Anfrage abgelehnt. Meist ist das knappe Tageskontingent der geteilten Grafikkarte (ZeroGPU) aufgebraucht oder die Warteschlange voll. Versuch es später noch einmal.',
  timeout: 'Nach 120 Sekunden kam keine Antwort. Die Demo ist vielleicht überlastet oder wacht gerade auf. Versuch es in einer Minute noch einmal.',
};

const STATUS_TEXT = {
  empty: 'Kein Text',
  net: 'Keine Verbindung',
  sleep: 'Demo schläft',
  api: 'Abgelehnt – Kontingent erschöpft?',
  timeout: 'Zeitüberschreitung',
};

const words = (s) => (s.match(/\S+/g) || []).length;
const seconds = (ms) => (ms / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Umschalter mit aria-pressed: genau ein Knopf aktiv
function seg(el, onPick) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const x of el.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
    onPick(b.dataset.v);
  });
}

function init() {
  const $ = (id) => document.getElementById(id);
  const ta = $('tr-text'), counter = $('tr-count'), go = $('tr-go');
  const status = $('tr-status'), statusText = $('tr-status-text'), secs = $('tr-secs');
  const empty = $('tr-empty'), result = $('tr-result'), err = $('tr-err');
  const kEdits = $('tr-edits'), kWords = $('tr-words'), kTime = $('tr-time'), copy = $('tr-copy'), copyLabel = $('tr-copy-l');

  let beam = 3, view = 'diff', last = null, stage = null, statusReq = null, busy = false, runId = 0, ctrl = null;

  function setStatus(kind, text, extra = '') {
    status.className = kind ? `status ${kind}` : 'status';
    if (statusText.textContent !== text) statusText.textContent = text;
    secs.textContent = extra;
  }
  function showStage() {
    const [kind, text] = STAGES[stage] || (/ERROR/.test(stage) ? ['err', 'Demo meldet einen Fehler'] : ['', 'Demo-Zustand unbekannt']);
    setStatus(kind, text);
  }
  function loadStatus() {
    statusReq ??= fetch(STATUS_API)
      .then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then((j) => { stage = j?.runtime?.stage ?? null; })
      .catch(() => { statusReq = null; }) // beim nächsten Korrigieren erneut versuchen
      .then(() => { if (!busy) showStage(); });
  }

  function updateCount() {
    const n = words(ta.value);
    counter.textContent = `${n} / ${MAX_WORDS} Wörter`;
    counter.classList.toggle('over', n > MAX_WORDS);
    go.disabled = busy || n > MAX_WORDS;
  }
  function setBusy(on) {
    busy = on;
    lab.send.disabled = on || !labState?.n;
    updateCount();
  }
  function render() {
    if (!last) return;
    if (view === 'diff') renderDiff(result, last.segs);
    else result.textContent = last.out;
  }
  function reset() {
    last = null;
    result.hidden = true;
    result.textContent = '';
    empty.hidden = false;
    err.replaceChildren();
    kEdits.textContent = kWords.textContent = kTime.textContent = '–';
    copy.disabled = true;
  }
  function fail(kind, detail) {
    reset();
    const p = document.createElement('p');
    p.textContent = MESSAGES[kind];
    const nodes = [p];
    if (detail) {
      const d = document.createElement('p');
      d.textContent = `Meldung der Demo: „${detail}“`;
      nodes.push(d);
    }
    const a = document.createElement('a');
    a.href = DEMO;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Demo direkt auf Hugging Face öffnen';
    nodes.push(a);
    err.replaceChildren(...nodes);
    setStatus('err', kind === 'api' && detail ? 'Fehler der Demo' : STATUS_TEXT[kind]);
  }

  // Ergebnis: Text bei Erfolg, null bei angezeigtem Fehler, undefined bei Abbruch ohne Meldung
  async function run() {
    loadStatus();
    if (busy) return undefined;
    const text = ta.value;
    if (!text.trim()) {
      fail('empty');
      return null;
    }
    if (words(text) > MAX_WORDS) return undefined;
    const id = ++runId;
    const c = (ctrl = new AbortController());
    const timer = setTimeout(() => c.abort(), TIMEOUT_MS);
    const t0 = performance.now();
    const tick = () => {
      const s = Math.round((performance.now() - t0) / 1000);
      const what = s < 10 ? 'HORST korrigiert …' : stage === 'SLEEPING' ? 'Demo wacht auf …' : 'Warteschlange oder Aufwachen …';
      setStatus('warn', what, `${s} s`);
    };
    const ticker = setInterval(tick, 1000);
    setBusy(true);
    tick();
    try {
      const out = await correctViaDemo(text, beam, c.signal);
      if (id !== runId) return undefined;
      const ms = performance.now() - t0;
      last = { out, segs: wordDiff(text, out) };
      err.replaceChildren();
      empty.hidden = true;
      result.hidden = false;
      copy.disabled = false;
      render();
      const n = countEdits(last.segs);
      kEdits.textContent = n;
      kWords.textContent = words(text);
      kTime.textContent = `${seconds(ms)} s`;
      setStatus('ok', n ? `Fertig – ${n} ${n === 1 ? 'Änderung' : 'Änderungen'}` : 'Fertig – keine Änderungen');
      return out;
    } catch (e) {
      if (id !== runId) return undefined;
      let kind = c.signal.aborted ? 'timeout' : e.kind || (e instanceof TypeError ? 'net' : 'api');
      if (kind === 'net' && stage === 'SLEEPING') kind = 'sleep';
      fail(kind, e.detail);
      return null;
    } finally {
      clearTimeout(timer);
      clearInterval(ticker);
      if (id === runId) setBusy(false);
    }
  }

  // Testraum-Bedienung
  ta.addEventListener('focus', loadStatus, { once: true });
  ta.addEventListener('input', updateCount);
  go.addEventListener('click', run);
  $('tr-clear').addEventListener('click', () => {
    runId++; // laufende Anfrage verwerfen
    ctrl?.abort();
    ta.value = '';
    reset();
    setBusy(false);
    if (statusReq) showStage();
    ta.focus();
  });
  $('tr-examples').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    ta.value = b.textContent;
    updateCount();
    ta.focus();
  });
  seg($('tr-beam'), (v) => { beam = Number(v); });
  seg($('tr-view'), (v) => { view = v; render(); });
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(last.out);
      copyLabel.textContent = 'Kopiert';
    } catch {
      copyLabel.textContent = 'Kopieren nicht möglich';
    }
    setTimeout(() => { copyLabel.textContent = 'Kopieren'; }, 2000);
  });

  // Vorbefüllen per testraum.html?text=… (ohne automatisch zu senden)
  const pre = new URLSearchParams(location.search).get('text');
  if (pre) ta.value = pre;

  // Fehlerlabor
  const lab = {
    clean: $('lab-clean'), types: $('lab-types'), count: $('lab-count'), countOut: $('lab-count-out'),
    send: $('lab-send'), broken: $('lab-broken'), info: $('lab-info'), check: $('lab-check'),
    checkDiff: $('lab-check-diff'), score: $('lab-score'),
  };
  let labState = null;

  function labReset() {
    labState = null;
    lab.broken.textContent = '';
    lab.info.textContent = '';
    lab.check.hidden = true;
    lab.score.textContent = '';
    lab.send.disabled = true;
  }
  lab.clean.addEventListener('input', labReset);
  $('lab-rand').addEventListener('click', () => {
    const others = SENTENCES.filter((x) => x !== lab.clean.value.trim());
    lab.clean.value = others[Math.floor(Math.random() * others.length)];
    labReset();
  });
  lab.types.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  });
  lab.count.addEventListener('input', () => { lab.countOut.textContent = lab.count.value; });
  $('lab-break').addEventListener('click', () => {
    labReset();
    const clean = lab.clean.value.trim();
    const types = [...lab.types.querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.v);
    const want = Number(lab.count.value);
    if (!clean || !types.length) {
      lab.info.textContent = clean ? 'Wähle mindestens eine Fehlerart.' : 'Gib zuerst einen sauberen Satz ein.';
      return;
    }
    const { text, applied } = breakSentence(clean, { types, count: want });
    const n = applied.length;
    const names = [...new Set(applied.map((x) => TYPE_NAMES[x.type]))].join(', ');
    let info = n === 1 ? `1 Fehler eingebaut (${names}).` : `${n} Fehler eingebaut (${names}).`;
    if (!n) info = 'Keine passende Stelle gefunden. Wähle andere Fehlerarten oder einen längeren Satz.';
    else if (n < want) info = `Nur ${n} von ${want} Fehlern ließen sich einbauen (${names}). Mehr Fehlerarten oder ein längerer Satz helfen.`;
    labState = { clean, broken: text, n, info };
    renderDiff(lab.broken, wordDiff(clean, text));
    lab.info.textContent = info;
    lab.send.disabled = busy || !n;
  });
  lab.send.addEventListener('click', async () => {
    const st = labState;
    if (!st?.n) return;
    ta.value = st.broken;
    updateCount();
    lab.check.hidden = true;
    lab.score.textContent = '';
    lab.info.textContent = 'Unterwegs zu HORST – den Fortschritt siehst du oben im Testraum.';
    const out = await run();
    if (st !== labState) return;
    lab.info.textContent = out === null ? 'Das hat nicht geklappt – die Meldung steht oben im Testraum.' : st.info;
    if (typeof out !== 'string') return;
    const segs = wordDiff(out, st.clean);
    const rest = countEdits(segs);
    const fixed = Math.max(0, st.n - rest);
    renderDiff(lab.checkDiff, segs);
    lab.check.hidden = false;
    const b = document.createElement('strong');
    b.textContent = `HORST hat ${fixed} von ${st.n} Fehlern behoben.`;
    const note = rest === 0
      ? ' Das Ergebnis stimmt genau mit dem Original überein.'
      : ` ${rest} ${rest === 1 ? 'Stelle weicht' : 'Stellen weichen'} noch vom Original ab. Auch neue Änderungen von HORST zählen dabei als Abweichung – manche davon sind vielleicht gar nicht falsch.`;
    lab.score.replaceChildren(b, note);
  });

  updateCount();
}

if (typeof document !== 'undefined') init();
