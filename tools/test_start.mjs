// Selbsttest für die Logik der Startseite. Aufruf: node tools/test_start.mjs
import assert from 'node:assert/strict';
import { SAETZE, check, dayIndex, teile } from '../js/start.js';

assert.equal(SAETZE.length, 20);
for (const s of SAETZE) {
  const falsche = s.woerter.map((_, i) => i).filter((i) => check(s, i));
  assert.equal(falsche.length, 1, `genau ein falsches Wort: ${s.woerter.join(' ')}`);
  assert.ok(s.falsch >= 0 && s.falsch < s.woerter.length, 'Index im Bereich');
  const { kern } = teile(s.woerter[s.falsch]);
  assert.ok(kern && s.richtig && kern !== s.richtig, `Korrektur ≠ Fehler: ${kern}`);
  assert.ok(s.regel.length > 10, 'Regel vorhanden');
  assert.ok(!s.woerter.join('').includes('*'), 'Markierung entfernt');
  assert.ok(!check(s, -1) && !check(s, s.woerter.length), 'außerhalb falsch');
}
assert.equal(new Set(SAETZE.map((s) => s.woerter.join(' '))).size, 20, 'keine Doppelten');

assert.deepEqual(teile('Kino.'), { vor: '', kern: 'Kino', nach: '.' });
assert.deepEqual(teile('glaube,'), { vor: '', kern: 'glaube', nach: ',' });

for (const d of [new Date(1970, 0, 1), new Date(2026, 9, 6), new Date(2030, 11, 31)]) {
  const i = dayIndex(d, 20);
  assert.equal(i, dayIndex(new Date(d), 20), 'deterministisch');
  assert.ok(Number.isInteger(i) && i >= 0 && i < 20, 'im Bereich');
}
assert.equal(dayIndex(new Date(1970, 0, 1), 20), 0);
assert.equal(dayIndex(new Date(1970, 0, 2), 20), 1);
assert.equal(dayIndex(new Date(1970, 0, 21), 20), 0, 'zyklisch');
assert.equal(dayIndex(new Date(1969, 11, 31), 20), 19, 'vor 1970 nicht negativ');

console.log('ok: start');
