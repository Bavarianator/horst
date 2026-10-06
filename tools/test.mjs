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

// Getrennt/zusammen ist eine Änderung, Leerzeichen bleiben in der Anzeige erhalten
d = wordDiff('Wir kommen irgend wann an.', 'Wir kommen irgendwann an.');
assert.equal(show(d), 'Wir kommen [-irgend wann-]{+irgendwann+} an.');
assert.equal(countEdits(d), 1);
d = wordDiff('Das hat mir garnicht gefallen.', 'Das hat mir gar nicht gefallen.');
assert.equal(show(d), 'Das hat mir [-garnicht-]{+gar nicht+} gefallen.');
assert.equal(countEdits(d), 1);
d = wordDiff('eine Kaffee Maschine', 'eine Kaffeemaschine');
assert.equal(show(d), 'eine [-Kaffee Maschine-]{+Kaffeemaschine+}');
assert.equal(countEdits(d), 1);

// Ein geleertes Feld zählt jedes fehlende Wort, nicht nur einen Block
assert.equal(countEdits(wordDiff('', 'Wir warten seit einer Stunde.')), 5);
assert.equal(countEdits(wordDiff('per Email.', 'per E-Mail.')), 1);

console.log('ok: diff');
