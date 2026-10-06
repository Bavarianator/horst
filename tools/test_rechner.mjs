// Selbsttests für den F0,5-Rechner. Aufruf: node tools/test_rechner.mjs
import assert from 'node:assert/strict';
import { scores, marginal, PRESETS } from '../js/rechner.js';

const near = (a, b, tol = 0.001) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

let s = scores(42, 15, 58);
near(s.p, 0.737); near(s.r, 0.42); near(s.f05, 0.64, 0.005);

s = scores(0, 0, 0);
assert.deepEqual(s, { p: null, r: null, f05: null, f1: null });
assert.deepEqual(marginal(0, 0, 0), { fp: null, fn: null });
assert.equal(scores(0, 5, 5).f05, 0, 'P = R = 0 ergibt 0, nicht NaN');

s = scores(...PRESETS.perfekt);
assert.deepEqual([s.p, s.r, s.f05, s.f1], [1, 1, 1, 1]);

// Bei P = R zählt eine falsche Korrektur mehr als ein übersehener Fehler.
s = scores(30, 10, 10);
near(s.p, s.r);
const m = marginal(30, 10, 10);
assert.ok(m.fp > m.fn && m.fn > 0);

// Gegenprobe mit der P/R-Formel
const { p, r } = scores(20, 2, 80);
near(scores(20, 2, 80).f05, 1.25 * p * r / (0.25 * p + r), 1e-12);

console.log('ok: rechner');
