// Startseite: „Finde den Fehler“. Logik ohne DOM exportiert, DOM-Code nur in init().

// Das falsche Wort trägt im Quelltext ein „*“ davor, daraus ergibt sich der Index.
const S = (satz, richtig, regel) => {
  const woerter = satz.split(' ');
  return { woerter: woerter.map((w) => w.replace('*', '')), falsch: woerter.findIndex((w) => w.startsWith('*')), richtig, regel };
};

export const SAETZE = [
  S('Ich glaube, *das er heute nicht kommt.', 'dass', 'Die Konjunktion „dass“ lässt sich nicht durch „dieses“ oder „welches“ ersetzen.'),
  S('Wir warten schon *seid zwei Stunden auf den Bus.', 'seit', '„seit“ nennt einen Zeitpunkt oder eine Zeitspanne; „seid“ gehört zu „sein“ (ihr seid).'),
  S('Ihr *seit heute alle herzlich zu unserer Feier eingeladen.', 'seid', '„seid“ ist die Form von „sein“ (ihr seid); „seit“ gibt die Zeit an.'),
  S('Sie stimmte dem Plan *wieder besseres Wissen zu.', 'wider', '„wider“ bedeutet „gegen“: wider besseres Wissen, wider Erwarten.'),
  S('Der neue *Standart gilt ab Montag für alle Geräte.', 'Standard', 'Das englische Fremdwort „Standard“ endet auf -d.'),
  S('Sie liebt den *Rytmus dieser Musik.', 'Rhythmus', '„Rhythmus“ kommt aus dem Griechischen und wird mit rh und th geschrieben.'),
  S('Ich kann heute nicht kommen, ich bin *nähmlich krank.', 'nämlich', '„nämlich“ schreibt man ohne h.'),
  S('Die Pflanze ist leider schon lange *tod.', 'tot', 'Das Adjektiv „tot“ (nicht lebendig) schreibt man mit t; mit d heißt nur das Nomen „der Tod“.'),
  S('Der *Tot des alten Königs kam für alle unerwartet.', 'Tod', 'Das Nomen heißt „der Tod“ mit d, wie in „Todesfall“.'),
  S('Das Bild soll die Stimmung des Sommers *wiederspiegeln.', 'widerspiegeln', 'Bei „widerspiegeln“ bedeutet „wider“ so viel wie „zurück“; „wieder“ (noch einmal) passt nicht.'),
  S('Am Wochenende gehen wir mit unseren *freunden schwimmen.', 'Freunden', 'Nomen schreibt man groß.'),
  S('Zum Geburtstag wünscht er sich etwas *schönes.', 'Schönes', 'Nach „etwas“ wird ein Adjektiv zum Nomen und groß geschrieben.'),
  S('Wir treffen uns *Heute Abend vor dem Kino.', 'heute', '„heute“ ist ein Adverb und wird kleingeschrieben; groß wird nur „Abend“ als Nomen.'),
  S('Gestern habe ich einen *interessante Film gesehen.', 'interessanten', 'Nach „einen“ steht das Adjektiv im Akkusativ Maskulinum auf -en.'),
  S('Ich helfe *meinen Freund bei den Hausaufgaben.', 'meinem', '„helfen“ verlangt den Dativ: Wem helfe ich? Meinem Freund.'),
  S('Das Licht ging *aufeinmal aus.', 'auf einmal', '„auf einmal“ besteht aus Präposition und Zahlwort und wird getrennt geschrieben.'),
  S('Er *muß morgen sehr früh aufstehen.', 'muss', 'Nach kurzem Vokal steht ss, nicht ß: er muss.'),
  S('Meine Schwester hat in *Matematik eine Eins geschrieben.', 'Mathematik', '„Mathematik“ stammt aus dem Griechischen und wird mit th geschrieben.'),
  S('Wir haben gestern im Park gespielt und Eis *gegesen.', 'gegessen', 'Das Partizip von „essen“ behält das doppelte s des Stamms: gegessen.'),
  S('Mein Bruder ist größer *wie ich.', 'als', 'Nach einem Komparativ steht „als“; „wie“ gehört zum Gleichen (so groß wie).'),
];

// Satzzeichen vor und nach dem Wort bleiben Text, nur der Kern ist klickbar.
export function teile(wort) {
  const m = /^([^\p{L}]*)(.*?)([^\p{L}]*)$/u.exec(wort);
  return { vor: m[1], kern: m[2], nach: m[3] };
}

export const check = (satz, index) => index === satz.falsch;

// Tage seit 1970-01-01 nach lokalem Datum, damit der Satz um Mitternacht wechselt.
export function dayIndex(date, n) {
  const tage = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
  return ((tage % n) + n) % n;
}

function init() {
  const $ = (id) => document.getElementById(id);
  const root = $('spiel');
  if (!root) return;
  const ort = $('spiel-satz'), meldung = $('spiel-meldung'), zaehler = $('spiel-versuche');
  const btnLoesen = $('spiel-aufloesen'), btnWeiter = $('spiel-weiter');
  let nr = dayIndex(new Date(), SAETZE.length), versuche = 0, fertig = false;

  const el = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };

  function melde(titel, regel) {
    meldung.replaceChildren(el('b', titel), ...(regel ? [' ', regel] : []));
  }

  function zeigeKorrektur(btn, satz) {
    const kern = teile(satz.woerter[satz.falsch]).kern;
    btn.replaceChildren(el('del', kern), el('ins', satz.richtig));
    btn.classList.add('gefunden');
    btn.setAttribute('aria-label', `${kern} ist falsch, richtig: ${satz.richtig}`);
  }

  function beende(satz, btn, titel) {
    fertig = true;
    zeigeKorrektur(btn, satz);
    for (const b of ort.querySelectorAll('button')) b.disabled = true;
    btnLoesen.disabled = true;
    melde(titel, satz.regel);
    btnWeiter.focus();
  }

  function zeige() {
    const satz = SAETZE[nr];
    versuche = 0;
    fertig = false;
    zaehler.textContent = '0';
    btnLoesen.disabled = false;
    meldung.textContent = 'Tippe auf das Wort, das falsch geschrieben ist.';
    ort.replaceChildren(...satz.woerter.map((w, i) => {
      const { vor, kern, nach } = teile(w);
      const btn = el('button', kern, 'wort');
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (fertig || btn.classList.contains('geprueft')) return;
        versuche++;
        zaehler.textContent = String(versuche);
        if (check(satz, i)) return beende(satz, btn, 'Richtig gefunden!');
        btn.classList.add('geprueft');
        btn.setAttribute('aria-label', `${kern}, geprüft: stimmt`);
        melde('Das stimmt so. Such weiter.');
      });
      const einheit = el('span', '', 'einheit');
      einheit.append(vor, btn, nach);
      return einheit;
    }));
  }

  btnLoesen.addEventListener('click', () => {
    if (fertig) return;
    const satz = SAETZE[nr];
    beende(satz, ort.querySelectorAll('button')[satz.falsch], 'Aufgelöst.');
  });
  btnWeiter.addEventListener('click', () => {
    nr = (nr + 1) % SAETZE.length;
    zeige();
  });

  root.hidden = false;
  zeige();
}

if (typeof document !== 'undefined') init();
