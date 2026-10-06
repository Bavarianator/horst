// Wortweiser Vergleich zweier Texte für die Korrekturansicht.
// Segmente: {t, op} mit op = 'same' | 'del' | 'ins'. Reine Leerzeichen-Änderungen zählen nicht.

export function tokenize(s) {
  return s.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) || [];
}

// Größte LCS-Tabelle (Zellen); darüber wird der geänderte Mittelteil grob als ein Block gezeigt
export const MAX_CELLS = 4e6;

// ponytail: LCS in O(n·m) Speicher nur für den Mittelteil nach gleichem Anfang/Ende, gedeckelt durch MAX_CELLS; darüber Hirschberg
export function wordDiff(a, b) {
  const A = tokenize(a), B = tokenize(b);
  let p = 0, s = 0;
  while (p < A.length && p < B.length && A[p] === B[p]) p++;
  while (s < A.length - p && s < B.length - p && A[A.length - 1 - s] === B[B.length - 1 - s]) s++;
  // Leerraum an der Schnittkante bleibt im Mittelteil, damit die Ausrichtung wie beim vollen Vergleich bleibt
  while (p > 0 && /^\s+$/.test(A[p - 1])) p--;
  while (s > 0 && /^\s+$/.test(A[A.length - s])) s--;
  const MA = A.slice(p, A.length - s), MB = B.slice(p, B.length - s);
  const n = MA.length, m = MB.length, w = m + 1;
  const raw = A.slice(0, p).map((t) => ({ t, op: 'same' }));
  if ((n + 1) * w > MAX_CELLS) {
    for (const t of MA) raw.push({ t, op: 'del' });
    for (const t of MB) raw.push({ t, op: 'ins' });
  } else {
    const L = new Uint16Array((n + 1) * w); // LCS ≤ min(n, m) ≤ 2.000, passt in 16 Bit
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        L[i * w + j] = MA[i] === MB[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
      }
    }
    let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && MA[i] === MB[j]) raw.push({ t: MA[i++], op: 'same' }), j++;
      else if (j < m && (i === n || L[i * w + j + 1] >= L[(i + 1) * w + j])) raw.push({ t: MB[j++], op: 'ins' });
      else raw.push({ t: MA[i++], op: 'del' });
    }
  }
  for (const t of A.slice(A.length - s)) raw.push({ t, op: 'same' });
  // Änderungsblöcke sammeln, Leerraum darin behalten (sonst wird aus „Kaffee Maschine“ „KaffeeMaschine“)
  const blocks = [];
  let cur = null;
  for (const s of raw) {
    if (s.op === 'same') {
      cur = null;
      const last = blocks[blocks.length - 1];
      if (last && last.same !== undefined) last.same += s.t;
      else blocks.push({ same: s.t });
    } else {
      if (!cur) blocks.push((cur = { del: '', ins: '' }));
      cur[s.op] += s.t;
    }
  }
  // Getrennt/zusammen: zwei Blöcke, die nur ein Leerzeichen trennt und die zusammen nur Leerraum verschieben, sind eine Änderung
  for (let k = 0; k + 2 < blocks.length; k++) {
    const [a, ws, b] = blocks.slice(k, k + 3);
    if (a.same === undefined && b.same === undefined && /^\s+$/.test(ws.same || '')) {
      const del = a.del + ws.same + b.del, ins = a.ins + ws.same + b.ins;
      if (words(del) !== words(ins) && squash(del) === squash(ins)) blocks.splice(k--, 3, { del, ins });
    }
  }
  const segs = [];
  const push = (t, op) => {
    if (!t) return;
    const last = segs[segs.length - 1];
    if (last && last.op === op) last.t += t;
    else segs.push({ t, op });
  };
  for (const b of blocks) {
    if (b.same !== undefined) {
      push(b.same, 'same');
      continue;
    }
    // Leerraum am Rand des Neuen bleibt normaler Text; reine Leerraum-Änderungen zählen nicht
    const [, pre, core, post] = b.ins.match(/^(\s*)([\s\S]*?)(\s*)$/);
    push(pre, 'same');
    push(b.del.trim(), 'del');
    push(core, 'ins');
    push(post, 'same');
  }
  return segs;
}

const squash = (s) => s.replace(/\s+/g, '').toLowerCase();
// Wörter = Stücke mit Buchstaben oder Ziffern; Satzzeichen zählen extra (Bindestrich und Apostroph gehören zum Wort)
const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const marks = (s) => tokenize(s).filter((t) => /^[^\s\p{L}\p{N}'’-]$/u.test(t));
function markDiff(a, b) {
  const rest = marks(a);
  let extra = 0;
  for (const t of marks(b)) {
    const i = rest.indexOf(t);
    if (i >= 0) rest.splice(i, 1);
    else extra++;
  }
  return Math.max(rest.length, extra);
}

// Zahl der Änderungen: je Block die geänderten Wörter plus geänderte Satzzeichen;
// reine Getrennt-/Zusammenschreibung (andere Wortzahl, gleiche Buchstaben) zählt einfach
export function countEdits(segs) {
  let n = 0, del = '', ins = '';
  const close = () => {
    if (/\S/.test(del + ins)) {
      n += words(del) !== words(ins) && squash(del) === squash(ins) ? 1 : Math.max(words(del), words(ins)) + markDiff(del, ins);
    }
    del = ins = '';
  };
  for (const s of segs) {
    if (s.op === 'same') close();
    else if (s.op === 'del') del += s.t;
    else ins += s.t;
  }
  close();
  return n;
}

// Segmente als DOM in el schreiben (textContent, nie innerHTML)
export function renderDiff(el, segs) {
  el.replaceChildren(...segs.map((s) => {
    if (s.op === 'same') return document.createTextNode(s.t);
    const node = document.createElement(s.op);
    node.textContent = s.t;
    return node;
  }));
}
