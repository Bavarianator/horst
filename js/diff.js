// Wortweiser Vergleich zweier Texte für die Korrekturansicht.
// Segmente: {t, op} mit op = 'same' | 'del' | 'ins'. Reine Leerzeichen-Änderungen zählen nicht.

export function tokenize(s) {
  return s.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) || [];
}

// ponytail: LCS in O(n·m) Speicher, reicht für die 500-Wörter-Grenze (~2.000 Tokens); darüber Hirschberg
export function wordDiff(a, b) {
  const A = tokenize(a), B = tokenize(b);
  const n = A.length, m = B.length, w = m + 1;
  const L = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i * w + j] = A[i] === B[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
    }
  }
  const raw = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) raw.push({ t: A[i++], op: 'same' }), j++;
    else if (j < m && (i === n || L[i * w + j + 1] >= L[(i + 1) * w + j])) raw.push({ t: B[j++], op: 'ins' });
    else raw.push({ t: A[i++], op: 'del' });
  }
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
      if (squash(del) === squash(ins)) blocks.splice(k--, 3, { del, ins });
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
const words = (s) => s.split(/\s+/).filter(Boolean).length;

// Zahl der Änderungen: je Block die geänderten Wörter, reine Getrennt-/Zusammenschreibung zählt einfach
export function countEdits(segs) {
  let n = 0, del = '', ins = '';
  const close = () => {
    if (/\S/.test(del + ins)) n += squash(del) === squash(ins) ? 1 : Math.max(words(del), words(ins));
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
