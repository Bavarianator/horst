// Selbsttests für das Korrektur-Duell. Aufruf: node tools/test_duell.mjs
import assert from 'node:assert/strict';
import { wordDiff, countEdits } from '../js/diff.js';
import { SAETZE, score, pickRounds, rating } from '../js/duell-logik.js';

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

assert.equal(SAETZE.length, 16);
for (const s of SAETZE) {
  const n = countEdits(wordDiff(s.fehlerhaft, s.loesung));
  assert.ok(n >= 1 && n <= 3, `1–3 Fehler: ${s.fehlerhaft}`);
  assert.equal(n, s.kat.length, `Fehlerzahl passt nicht: ${s.fehlerhaft}`);
  assert.ok(s.regel && !/["„“]/.test(s.fehlerhaft + s.loesung), `Regel da, keine Anführungszeichen: ${s.loesung}`);

  const voll = score(s.fehlerhaft, s.loesung, s.loesung, { sekunden: 5 });
  assert.equal(voll.punkte, n + 1, 'Lösung schnell = alle Fehler + Bonus');
  assert.equal(voll.punkte, voll.max);
  assert.equal(score(s.fehlerhaft, s.loesung, `  ${s.loesung.replace(' ', '   ')} `, { sekunden: 30 }).punkte, n, 'Leerzeichen egal, ohne Bonus');
  assert.equal(score(s.fehlerhaft, s.loesung, s.fehlerhaft, { sekunden: 5 }).punkte, 0, 'unverändert = 0');
  assert.equal(score(s.fehlerhaft, s.loesung, s.fehlerhaft, { tipp: true }).punkte, 0, 'nie unter 0');
  const kaputt = s.loesung.replace(/^(\S+)/, '$1x');
  assert.ok(score(s.fehlerhaft, s.loesung, kaputt, { sekunden: 5 }).punkte < voll.punkte, 'neuer Fehler kostet');
  assert.equal(score(s.fehlerhaft, s.loesung, s.loesung, { sekunden: 5, tipp: true }).punkte, n, 'Tipp kostet 1');
}

for (let seed = 1; seed <= 50; seed++) {
  const r = pickRounds(8, mulberry32(seed));
  assert.equal(r.length, 8);
  assert.equal(new Set(r).size, 8, 'keine Doppelten');
}
assert.deepEqual(pickRounds(8, mulberry32(7)), pickRounds(8, mulberry32(7)), 'gleicher Seed, gleiche Runden');

assert.equal(rating(1), 'Duden auf zwei Beinen');
assert.equal(rating(0), 'Rotstift-Lehrling');
assert.notEqual(rating(0.5), rating(0.8));

console.log(`ok: duell (${SAETZE.length} Sätze)`);
