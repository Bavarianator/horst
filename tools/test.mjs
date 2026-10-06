// Selbsttests für die JavaScript-Logik. Aufruf: node tools/test.mjs
import assert from 'node:assert/strict';
import { wordDiff, countEdits } from '../js/diff.js';

const show = (segs) => segs.map((s) => (s.op === 'same' ? s.t : s.op === 'del' ? `[-${s.t}-]` : `{+${s.t}+}`)).join('');

let d = wordDiff('ich weis nicht das es so ist.', 'Ich weiß nicht, dass es so ist.');
assert.equal(show(d), '[-ich-]{+Ich+} [-weis-]{+weiß+} nicht{+,+} [-das-]{+dass+} es so ist.');
assert.equal(countEdits(d), 4);

d = wordDiff('in die stadt , und', 'in die Stadt und');
assert.equal(show(d), 'in die [-stadt-]{+Stadt+} [-,-]und');
assert.equal(countEdits(d), 2);

d = wordDiff('gleich  bleibt', 'gleich bleibt');
assert.equal(countEdits(d), 0, 'Leerzeichen allein sind keine Änderung');

assert.equal(countEdits(wordDiff('', '')), 0);

console.log('ok: diff');
