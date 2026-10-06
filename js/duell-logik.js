// Korrektur-Duell: Sätze, Punkte, Auswahl, Titel. Ohne DOM, damit tools/test_duell.mjs alles prüfen kann.
import { wordDiff, countEdits } from './diff.js';

// kat: eine Kategorie je Fehler, kat.length ist also die Fehlerzahl des Satzes
export const SAETZE = [
  { fehlerhaft: 'Wir wünschen unserer Nachbarin alles gute zum Geburtstag.',
    loesung: 'Wir wünschen unserer Nachbarin alles Gute zum Geburtstag.',
    kat: ['Groß-/Kleinschreibung'],
    regel: 'In festen Wendungen wie „alles Gute“ ist das Adjektiv ein Nomen und wird großgeschrieben.' },
  { fehlerhaft: 'Wir haben uns gestern abend einen spannenden Film angesehen.',
    loesung: 'Wir haben uns gestern Abend einen spannenden Film angesehen.',
    kat: ['Groß-/Kleinschreibung'],
    regel: 'Tageszeiten nach gestern, heute und morgen sind Nomen: gestern Abend, heute Morgen, morgen Mittag.' },
  { fehlerhaft: 'Die Strasse vor unserem Haus wird seid Montag repariert.',
    loesung: 'Die Straße vor unserem Haus wird seit Montag repariert.',
    kat: ['ß/ss', 'seit/seid'],
    regel: 'Nach langem Vokal steht ß: Straße, Fuß, groß. „Seit“ mit t gehört zu Zeitangaben, „seid“ mit d ist eine Form von „sein“ (ihr seid).' },
  { fehlerhaft: 'Mein kleiner Bruder wiederspricht mir bei jeder gelegenheit.',
    loesung: 'Mein kleiner Bruder widerspricht mir bei jeder Gelegenheit.',
    kat: ['wieder/wider', 'Groß-/Kleinschreibung'],
    regel: '„Wider“ heißt „gegen“ (widersprechen, Widerstand), „wieder“ heißt „noch einmal“ (wiederholen). Nomen wie „Gelegenheit“ schreibt man groß.' },
  { fehlerhaft: 'Seit ihr schon mit den hausaufgaben fertig?',
    loesung: 'Seid ihr schon mit den Hausaufgaben fertig?',
    kat: ['seit/seid', 'Groß-/Kleinschreibung'],
    regel: '„Seid“ mit d ist eine Form von „sein“ (ihr seid), „seit“ mit t gehört zu Zeitangaben. Nomen wie „Hausaufgaben“ schreibt man groß.' },
  { fehlerhaft: 'In der Pause hat mir meine Freundin erzählt das sie etwas lustiges erlebt hat.',
    loesung: 'In der Pause hat mir meine Freundin erzählt, dass sie etwas Lustiges erlebt hat.',
    kat: ['Komma', 'das/dass', 'Groß-/Kleinschreibung'],
    regel: 'Vor „dass“ steht immer ein Komma, und „dass“ mit ss leitet den Nebensatz ein. Nach etwas, nichts und viel wird das Adjektiv zum Nomen: etwas Lustiges.' },
  { fehlerhaft: 'Unser Lehrer hat uns erklärt wie man einen Rhytmus erkennt.',
    loesung: 'Unser Lehrer hat uns erklärt, wie man einen Rhythmus erkennt.',
    kat: ['Komma', 'Tippfehler'],
    regel: 'Nebensätze mit wie, was oder ob werden durch Komma abgetrennt. Rhythmus hat zwei h: Rh und th.' },
  { fehlerhaft: 'Als der Unterricht anfing regnete es schon.',
    loesung: 'Als der Unterricht anfing, regnete es schon.',
    kat: ['Komma'],
    regel: 'Ein Nebensatz mit „als“ wird durch Komma vom Hauptsatz getrennt – auch wenn er am Satzanfang steht.' },
  { fehlerhaft: 'Ich schicke Ihnen die Unterlagen Morgen per Email.',
    loesung: 'Ich schicke Ihnen die Unterlagen morgen per E-Mail.',
    kat: ['Groß-/Kleinschreibung', 'Bindestrich'],
    regel: '„Morgen“ im Sinn von „am nächsten Tag“ ist ein Adverb und wird kleingeschrieben. E-Mail schreibt man mit Bindestrich, Email ist der Überzug auf Kochtöpfen.' },
  { fehlerhaft: 'Die Besprechung wurde auf nächsten dienstag verschoben weil der Chef krank ist.',
    loesung: 'Die Besprechung wurde auf nächsten Dienstag verschoben, weil der Chef krank ist.',
    kat: ['Groß-/Kleinschreibung', 'Komma'],
    regel: 'Wochentage sind Nomen und werden großgeschrieben. Vor „weil“ steht immer ein Komma, denn es leitet einen Nebensatz ein.' },
  { fehlerhaft: 'Wir müssen die Reperatur der Maschiene bis Freitag abschliessen.',
    loesung: 'Wir müssen die Reparatur der Maschine bis Freitag abschließen.',
    kat: ['Tippfehler', 'Tippfehler', 'ß/ss'],
    regel: 'Reparatur kommt von reparieren, Maschine hat ein einfaches i. Nach dem langen ie in „schließen“ steht ß.' },
  { fehlerhaft: 'Der Kunde, der gestern angerufen hat möchte ein Angebot zu einem günstigerem Preis.',
    loesung: 'Der Kunde, der gestern angerufen hat, möchte ein Angebot zu einem günstigeren Preis.',
    kat: ['Komma', 'Endung'],
    regel: 'Ein eingeschobener Relativsatz wird vorn und hinten durch Komma abgetrennt. Nach „einem“ endet das Adjektiv auf -en: zu einem günstigeren Preis.' },
  { fehlerhaft: 'Am wochenende fahren wir mit den Fahrrad an den See.',
    loesung: 'Am Wochenende fahren wir mit dem Fahrrad an den See.',
    kat: ['Groß-/Kleinschreibung', 'Endung'],
    regel: 'Nomen schreibt man groß, auch nach „am“. „Mit“ verlangt den Dativ: mit dem Fahrrad.' },
  { fehlerhaft: 'Beim joggen habe ich mir den Fuss verletzt.',
    loesung: 'Beim Joggen habe ich mir den Fuß verletzt.',
    kat: ['Groß-/Kleinschreibung', 'ß/ss'],
    regel: 'Nach „beim“ wird das Verb zum Nomen und großgeschrieben: beim Joggen. Nach langem Vokal steht ß: Fuß.' },
  { fehlerhaft: 'Weil dass Wetter so schön war haben wir im Garten gegrillt.',
    loesung: 'Weil das Wetter so schön war, haben wir im Garten gegrillt.',
    kat: ['das/dass', 'Komma'],
    regel: 'Vor einem Nomen steht der Artikel „das“ mit einem s. Ein Nebensatz mit „weil“ wird durch Komma abgetrennt, auch am Satzanfang.' },
  { fehlerhaft: 'Nach den vielen Widerholungen im Training waren wir alle ziehmlich müde.',
    loesung: 'Nach den vielen Wiederholungen im Training waren wir alle ziemlich müde.',
    kat: ['wieder/wider', 'Tippfehler'],
    regel: '„Wiederholen“ heißt „noch einmal tun“, also mit ie. „Ziemlich“ schreibt man ohne Dehnungs-h.' },
];

const norm = (s) => s.trim().replace(/\s+/g, ' ');
export const fehler = (a, b) => countEdits(wordDiff(norm(a), norm(b)));

export const BONUS_SEKUNDEN = 20;

export function score(fehlerhaft, loesung, nutzer, { sekunden = Infinity, tipp = false } = {}) {
  const orig = fehler(fehlerhaft, loesung);
  const rest = fehler(nutzer, loesung);
  const behoben = Math.max(0, orig - rest);
  const bonus = rest === 0 && sekunden < BONUS_SEKUNDEN ? 1 : 0;
  const punkte = Math.max(0, behoben + bonus - (tipp ? 1 : 0));
  return { orig, rest, behoben, bonus, punkte, max: orig + 1 };
}

// Fisher-Yates auf einer Kopie; rng liefert [0, 1)
export function pickRounds(n, rng = Math.random) {
  const a = [...SAETZE];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export function rating(anteil) {
  if (anteil >= 0.9) return 'Duden auf zwei Beinen';
  if (anteil >= 0.7) return 'Adlerauge mit Rotstift';
  if (anteil >= 0.4) return 'Korrektor:in';
  return 'Rotstift-Lehrling';
}
