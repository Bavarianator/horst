// Selbsttests für 404-Logik und Feed. Aufruf: node tools/test_extras.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { levenshtein, slugFromPath, suggest } from '../js/404.js';

assert.equal(levenshtein('kitten', 'sitting'), 3);
assert.equal(slugFromPath('/horst/benchmrak.html'), 'benchmrak');
assert.equal(slugFromPath('/horst/Foo/NEWS/'), 'news');
assert.doesNotThrow(() => slugFromPath('/horst/%E0%A4%A.html'));
assert.equal(slugFromPath('/horst/News.HTML', true), 'News');
assert.equal(slugFromPath('/horst/News'), 'news');
assert.equal(suggest('benchmrak').page.slug, 'benchmark');
assert.equal(suggest('tesstraum').page.slug, 'testraum');
assert.equal(suggest('xyzxyzxyz'), null);
assert.equal(suggest(''), null);
console.log('ok: 404');

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const feed = read('feed.xml');
// Wohlgeformtheit: Tags sauber verschachtelt (kein Parser im Node-Kern; Python-minidom prüft zusätzlich)
const stack = [];
for (const m of feed.replace(/<\?xml[^>]*\?>/, '').matchAll(/<(\/?)([A-Za-z]+)[^>]*?(\/?)>/g)) {
  if (m[3]) continue;
  if (m[1]) assert.equal(stack.pop(), m[2], 'Tag ' + m[2]);
  else stack.push(m[2]);
}
assert.deepEqual(stack, []);
const dated = [...read('news.html').matchAll(/<li class="tl-done" id="([^"]+)"><div class="tl-date">\d\d\.\d\d\.\d{4}</g)].map((m) => m[1]);
const ids = [...feed.matchAll(/<id>[^<]*news\.html#([^<]+)<\/id>/g)].map((m) => m[1]);
assert.ok(dated.length > 0);
assert.deepEqual(ids.sort(), dated.sort(), 'Feed-Einträge = datierte Beiträge');
console.log('ok: feed (' + ids.length + ' Einträge)');
