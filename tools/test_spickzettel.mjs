// Selbsttests für den Spickzettel. Aufruf: node tools/test_spickzettel.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize, matches } from '../js/spickzettel.js';

assert.equal(normalize('  Daß  ist  '), 'dass ist');
assert.equal(normalize('Fuß'), 'fuss');
assert.equal(normalize('nämlich'), normalize('naemlich'));
assert.equal(normalize('Ärger'), normalize('arger'));
assert.ok(matches('Ich hoffe, dass du kommst.', 'Dass'));
assert.ok(matches('das oder dass', 'DASS'));
assert.ok(matches('nämlich ohne h', 'naemlich'));
assert.ok(matches('nämlich ohne h', 'namlich'));
assert.ok(matches('Wir gehen am Fluss spazieren', 'fluß'));
assert.ok(matches('Komma vor und', 'und komma'), 'Wörter in beliebiger Reihenfolge');
assert.ok(matches('beliebig', ''), 'leere Suche passt immer');
assert.ok(matches('beliebig', '   '));
assert.ok(!matches('seit oder seid', 'dass'));
assert.ok(!matches('Komma vor und', 'komma oder'), 'alle Wörter müssen vorkommen');

const html = readFileSync(new URL('../spickzettel.html', import.meta.url), 'utf8');
const KAT = new Set(['rechtschreibung', 'gross-klein', 'kommas', 'grammatik', 'getrennt-zusammen', 'zeichensetzung']);
const arts = [...html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/g)];
assert.equal(arts.length, 24, 'genau 24 Einträge');
const ids = arts.map((m) => /\bid="([^"]+)"/.exec(m[1])?.[1]);
assert.ok(ids.every(Boolean), 'jeder Eintrag hat eine id');
assert.equal(new Set(ids).size, 24, 'ids eindeutig');
for (const [, attrs, inner] of arts) {
  const id = /\bid="([^"]+)"/.exec(attrs)[1];
  assert.ok(KAT.has(/\bdata-kat="([^"]*)"/.exec(attrs)?.[1]), `${id}: data-kat gültig`);
  const href = /href="testraum\.html\?([^"]+)"/.exec(inner)?.[1];
  assert.ok(href, `${id}: Testraum-Link`);
  const text = new URLSearchParams(href.replaceAll('&amp;', '&')).get('text');
  assert.ok(text, `${id}: text-Parameter`);
  // Der Link muss den falschen Beispielsatz tragen: <ins> weg, <del> auspacken.
  const ex = /<p class="sz-ex">(.*?)<\/p>/.exec(inner)?.[1];
  assert.ok(ex?.includes('<ins>') || ex?.includes('<del>'), `${id}: Beispiel mit del/ins`);
  assert.equal(text, ex.replace(/<ins>.*?<\/ins>/g, '').replace(/<\/?del>/g, ''), `${id}: Link-Text = falscher Satz`);
}
for (const k of KAT) assert.ok(html.includes(`data-kat="${k}" aria-pressed`), `Filter für ${k}`);

console.log('ok: spickzettel');
