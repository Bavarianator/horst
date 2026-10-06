// Korrektur-Duell: Bedienung. Punkte und Sätze kommen aus duell-logik.js.
import { wordDiff, renderDiff } from './diff.js';
import { score, pickRounds, rating } from './duell-logik.js';

const RUNDEN = 8;
const LINK = 'https://bavarianator.github.io/horst/duell.html';
const SPEICHER = 'horst-duell-bestwert';
const $ = (id) => document.getElementById(id);
const el = Object.fromEntries(['start', 'spiel', 'ende', 'bestwert', 'los', 'runde', 'punkte', 'uhr', 'eingabe', 'pruefen',
  'tippen', 'tipp', 'auswertung', 'vergleich', 'urteil', 'regel', 'weiter', 'titel', 'bestinfo', 'e-punkte', 'e-zeit',
  'e-fehlerfrei', 'nochmal', 'kopieren', 'teilen', 'ansage'].map((id) => [id, $(id)]));

let runden, nr, summe, moeglich, zeit, fehlerfrei, tippGenutzt, beginn, takt, geprueft, ergebnisText;

const mehrzahl = (n, eins, viele) => `${n} ${n === 1 ? eins : viele}`;
function dauer(s) {
  const t = Math.round(s);
  return t < 60 ? `${t} s` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} min`;
}
const ansagen = (text) => { el.ansage.textContent = text; };

function bestLesen() {
  try {
    const b = JSON.parse(localStorage.getItem(SPEICHER));
    return Number.isFinite(b?.punkte) && b.moeglich > 0 ? b : null;
  } catch { return null; }
}
function bestSchreiben(wert) {
  try { localStorage.setItem(SPEICHER, JSON.stringify(wert)); } catch { /* ohne Speicher geht es auch */ }
}

function zeige(ansicht) {
  for (const id of ['start', 'spiel', 'ende']) el[id].hidden = id !== ansicht;
}

function starten() {
  runden = pickRounds(RUNDEN);
  nr = summe = moeglich = zeit = fehlerfrei = 0;
  zeige('spiel');
  runde();
}

function runde() {
  const satz = runden[nr];
  geprueft = tippGenutzt = false;
  el.runde.textContent = `Satz ${nr + 1} von ${RUNDEN}`;
  el.punkte.textContent = mehrzahl(summe, 'Punkt', 'Punkte');
  el.eingabe.value = satz.fehlerhaft;
  el.eingabe.readOnly = false;
  el.pruefen.disabled = el.tippen.disabled = false;
  el.tipp.hidden = el.auswertung.hidden = true;
  el.weiter.textContent = nr + 1 < RUNDEN ? 'Nächster Satz' : 'Zum Ergebnis';
  beginn = performance.now();
  el.uhr.textContent = '0 s';
  clearInterval(takt);
  takt = setInterval(() => { el.uhr.textContent = `${Math.floor((performance.now() - beginn) / 1000)} s`; }, 1000);
  el.eingabe.focus();
}

function tipp() {
  const zaehler = {};
  for (const k of runden[nr].kat) zaehler[k] = (zaehler[k] || 0) + 1;
  const liste = Object.entries(zaehler).map(([k, n]) => (n > 1 ? `${n} × ${k}` : k)).join(', ');
  tippGenutzt = true;
  el.tippen.disabled = true;
  el.tipp.textContent = `Gesucht: ${liste}.`;
  el.tipp.hidden = false;
  ansagen(el.tipp.textContent);
  el.eingabe.focus();
}

function pruefen() {
  if (geprueft) return;
  geprueft = true;
  clearInterval(takt);
  const satz = runden[nr];
  const sekunden = (performance.now() - beginn) / 1000;
  const nutzer = el.eingabe.value;
  const r = score(satz.fehlerhaft, satz.loesung, nutzer, { sekunden, tipp: tippGenutzt });
  summe += r.punkte;
  moeglich += r.max;
  zeit += sekunden;
  if (r.rest === 0) fehlerfrei++;

  el.uhr.textContent = `${Math.floor(sekunden)} s`;
  el.eingabe.readOnly = true;
  el.pruefen.disabled = el.tippen.disabled = true;
  renderDiff(el.vergleich, wordDiff(nutzer.trim().replace(/\s+/g, ' '), satz.loesung));
  const teile = [`${r.behoben} von ${mehrzahl(r.orig, 'Fehler', 'Fehlern')} behoben`];
  if (r.bonus) teile.push('Tempobonus +1');
  if (tippGenutzt) teile.push('Tipp −1');
  const urteil = r.rest === 0 ? 'Fehlerfrei.' : `Noch ${mehrzahl(r.rest, 'Stelle', 'Stellen')} anders als die Lösung.`;
  el.urteil.textContent = `${urteil}\n${mehrzahl(r.punkte, 'Punkt', 'Punkte')}: ${teile.join(', ')}.`;
  el.regel.textContent = satz.regel;
  el.punkte.textContent = mehrzahl(summe, 'Punkt', 'Punkte');
  el.auswertung.hidden = false;
  ansagen(el.urteil.textContent);
  el.weiter.focus();
}

function weiter() {
  nr++;
  if (nr < RUNDEN) runde();
  else ende();
}

function ende() {
  const anteil = moeglich ? summe / moeglich : 0;
  const titel = rating(anteil);
  const alt = bestLesen();
  const neu = !alt || anteil > alt.punkte / alt.moeglich;
  if (neu) bestSchreiben({ punkte: summe, moeglich });
  el.titel.textContent = titel;
  el['e-punkte'].textContent = `${summe}/${moeglich}`;
  el['e-zeit'].textContent = dauer(zeit);
  el['e-fehlerfrei'].textContent = `${fehlerfrei}/${RUNDEN}`;
  el.bestinfo.textContent = neu
    ? 'Neuer Bestwert in diesem Browser.'
    : `Dein Bestwert in diesem Browser: ${alt.punkte} von ${alt.moeglich} Punkten.`;
  ergebnisText = `Korrektur-Duell: ${summe} von ${moeglich} Punkten, ${fehlerfrei} von ${RUNDEN} Sätzen fehlerfrei, `
    + `Zeit ${dauer(zeit)}. Mein Titel: ${titel}. Schaffst du mehr? ${LINK}`;
  el.teilen.hidden = true;
  zeige('ende');
  el.titel.focus();
  ansagen(`Ergebnis: ${summe} von ${moeglich} Punkten. ${titel}.`);
}

async function kopieren() {
  try {
    await navigator.clipboard.writeText(ergebnisText);
    ansagen('Ergebnis kopiert.');
    el.kopieren.textContent = 'Kopiert';
    setTimeout(() => { el.kopieren.textContent = 'Ergebnis kopieren'; }, 2000);
  } catch {
    // Ohne Zwischenablage-Zugriff: Text zeigen, damit man ihn selbst kopieren kann
    el.teilen.value = ergebnisText;
    el.teilen.hidden = false;
    el.teilen.select();
    ansagen('Kopieren nicht möglich. Der Text steht markiert im Feld darunter.');
  }
}

const best = bestLesen();
if (best) {
  el.bestwert.textContent = `Dein Bestwert in diesem Browser: ${best.punkte} von ${best.moeglich} Punkten.`;
  el.bestwert.hidden = false;
}
el.los.addEventListener('click', starten);
el.nochmal.addEventListener('click', starten);
el.pruefen.addEventListener('click', pruefen);
el.tippen.addEventListener('click', tipp);
el.weiter.addEventListener('click', weiter);
el.kopieren.addEventListener('click', kopieren);
el.eingabe.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    pruefen();
  }
});
