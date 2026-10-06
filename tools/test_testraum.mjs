// Selbsttests für Testraum und Fehlerlabor. Aufruf: node tools/test_testraum.mjs
import assert from 'node:assert/strict';
import { breakSentence, mulberry32, SENTENCES, TYPES } from '../js/fehlerlabor.js';
import { parseSSE, correctViaDemo } from '../js/testraum.js';
import { wordDiff, countEdits } from '../js/diff.js';

const s = 'Ich weiß nicht, ob wir das Paket schon morgen bekommen.';

// Deterministisch bei gleichem Seed
const a = breakSentence(s, { types: TYPES, count: 3, rng: mulberry32(7) });
assert.deepEqual(a, breakSentence(s, { types: TYPES, count: 3, rng: mulberry32(7) }));
assert.equal(a.applied.length, 3);
assert.notEqual(a.text, s);

// count 0 lässt den Text unverändert
assert.deepEqual(breakSentence(s, { types: TYPES, count: 0, rng: mulberry32(1) }), { text: s, applied: [] });

// Nicht anwendbare Typen: kein Komma im Satz → nichts passiert, keine Endlosschleife
assert.deepEqual(breakSentence('Heute regnet es.', { types: ['komma'], count: 5, rng: mulberry32(3) }), { text: 'Heute regnet es.', applied: [] });

// Nur ein Komma vorhanden → höchstens ein Fehler, Komma weg
const k = breakSentence(s, { types: ['komma'], count: 3, rng: mulberry32(1) });
assert.equal(k.applied.length, 1);
assert.equal(k.text, s.replace(',', ''));

// Unbekannte Typen werden ignoriert
assert.deepEqual(breakSentence(s, { types: ['gibtsnicht'], count: 2, rng: mulberry32(1) }), { text: s, applied: [] });

const CHECK = {
  tipp: (f, t) => /^\p{L}{3,}$/u.test(f) && t !== f && Math.abs(t.length - f.length) <= 1,
  umlaut: (f, t) => (f.match(/[äöüÄÖÜß]/g) || []).length - (t.match(/[äöüÄÖÜß]/g) || []).length === 1,
  verwechslung: (f, t) => t !== f && t.toLowerCase() !== f.toLowerCase(),
  gross: (f, t) => t === f[0].toLowerCase() + f.slice(1) && t !== f,
  komma: (f, t) => f === ',' && t === '',
};

for (let seed = 1; seed <= 200; seed++) {
  const clean = SENTENCES[seed % SENTENCES.length];
  const count = 1 + (seed % 5);
  // Alle Typen: Sätze sind lang genug für die volle Anzahl
  const r = breakSentence(clean, { types: TYPES, count, rng: mulberry32(seed) });
  assert.equal(r.applied.length, count, `Seed ${seed}: ${r.applied.length} statt ${count}`);
  assert.equal(new Set(r.applied.map((x) => x.at)).size, count, 'kein Wort doppelt');
  assert.ok(countEdits(wordDiff(clean, r.text)) >= 1);
  // Einzelner Typ: nur dieser Typ, mit passender Änderung
  const type = TYPES[seed % TYPES.length];
  const one = breakSentence(clean, { types: [type], count, rng: mulberry32(seed) });
  assert.ok(one.applied.length <= count);
  for (const x of one.applied) {
    assert.equal(x.type, type);
    assert.ok(CHECK[type](x.from, x.to), `${type}: ${x.from} → ${x.to}`);
  }
}

// SSE-Parser
assert.deepEqual(parseSSE('event: heartbeat\ndata: null\n\nevent: complete\ndata: ["Ich weiß nicht, dass es so ist."]\n\n'), [
  { event: 'heartbeat', data: null },
  { event: 'complete', data: ['Ich weiß nicht, dass es so ist.'] },
]);
assert.deepEqual(parseSSE('event: error\ndata: null\n\n'), [{ event: 'error', data: null }]);
assert.deepEqual(parseSSE('event: error\r\ndata: "Kontingent erschöpft"\r\n\r\n'), [{ event: 'error', data: 'Kontingent erschöpft' }]);
assert.deepEqual(parseSSE('event: error\ndata: kein JSON\n\n'), [{ event: 'error', data: 'kein JSON' }]);
assert.deepEqual(parseSSE('event: heartbeat\n\n: Kommentar\n\n'), [{ event: 'heartbeat', data: null }]);
assert.deepEqual(parseSSE('event: generating\ndata: ["Ich"]\n\nevent: complete\ndata: ["Ich weiß."]'), [
  { event: 'generating', data: ['Ich'] },
  { event: 'complete', data: ['Ich weiß.'] },
]);
assert.deepEqual(parseSSE(''), []);

// Demo-Aufruf mit gestückeltem Ereignisstrom (Stücke enden mitten in Zeilen)
function fakeFetch(chunks, { post = '{"event_id":"e1"}', status = 200, getStatus = 200, keepOpen = false } = {}) {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    calls.push([url, opts.method || 'GET', opts.body]);
    if (opts.method === 'POST') return new Response(post, { status });
    if (getStatus !== 200) return new Response('', { status: getStatus });
    const enc = new TextEncoder();
    return new Response(new ReadableStream({ start(c) { for (const x of chunks) c.enqueue(enc.encode(x)); if (!keepOpen) c.close(); } }));
  };
  return calls;
}
let calls = fakeFetch(['event: heartbeat\ndata: null\n\nevent: compl', 'ete\ndata: ["Ich weiß', ' nicht."]\n', '\n']);
assert.equal(await correctViaDemo('ich weis nicht.', 1), 'Ich weiß nicht.');
assert.deepEqual(calls, [
  ['https://bayernator-horst.hf.space/gradio_api/call/correct', 'POST', '{"data":["ich weis nicht.",1]}'],
  ['https://bayernator-horst.hf.space/gradio_api/call/correct/e1', 'GET', undefined],
]);
fakeFetch(['event: error\ndata: null\n\n']);
await assert.rejects(correctViaDemo('x', 1), { kind: 'api', detail: '' });
fakeFetch(['event: error\ndata: "Kontingent erschöpft"\n\n']);
await assert.rejects(correctViaDemo('x', 1), { kind: 'api', detail: 'Kontingent erschöpft' });
// CRLF, auch über Stückgrenzen getrennt, und einzelnes CR. Der Strom bleibt offen: das Ergebnis muss sofort kommen.
const soon = (p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('hängt')), 500))]);
fakeFetch(['event: heartbeat\r\ndata: null\r\n\r', '\nevent: complete\r', '\ndata: ["A"]\r\n\r', '\n'], { keepOpen: true });
assert.equal(await soon(correctViaDemo('a', 1)), 'A');
fakeFetch(['event: complete\rdata: ["B"]\r\r', 'event: heartbeat\r\r'], { keepOpen: true });
assert.equal(await soon(correctViaDemo('b', 1)), 'B');
// Fehlerdaten als Objekt werden zu Text
fakeFetch(['event: error\ndata: {"error":"GPU-Kontingent aufgebraucht"}\n\n']);
await assert.rejects(correctViaDemo('x', 1), { kind: 'api', detail: 'GPU-Kontingent aufgebraucht' });
fakeFetch(['event: error\ndata: {"code":7}\n\n']);
await assert.rejects(correctViaDemo('x', 1), { kind: 'api', detail: '{"code":7}' });
// Fehlende event_id: kein zweiter Aufruf
calls = fakeFetch([], { post: '{}' });
await assert.rejects(correctViaDemo('x', 1), { kind: 'api' });
assert.equal(calls.length, 1);
// HTTP-Status: 429/503 = Kontingent/überlastet, sonst Verbindung
fakeFetch([], { post: '', status: 429 });
await assert.rejects(correctViaDemo('x', 1), { kind: 'api' });
fakeFetch([], { post: '', status: 502 });
await assert.rejects(correctViaDemo('x', 1), { kind: 'net' });
fakeFetch([], { getStatus: 503 });
await assert.rejects(correctViaDemo('x', 1), { kind: 'api' });
fakeFetch(['event: complete\ndata: kaputt']);
await assert.rejects(correctViaDemo('x', 1), { kind: 'api' }, 'kein JSON-Array');
fakeFetch(['event: heartbeat\ndata: null\n\n']);
await assert.rejects(correctViaDemo('x', 1), { kind: 'api' }, 'Strom endet ohne Ergebnis');

console.log('ok: testraum');
