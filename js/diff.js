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
  const segs = [];
  for (const s of raw) {
    if (/^\s+$/.test(s.t)) {
      if (s.op === 'del') continue;
      s.op = 'same';
    }
    const last = segs[segs.length - 1];
    if (last && last.op === s.op) last.t += s.t;
    else segs.push({ ...s });
  }
  // Innerhalb eines Änderungsblocks erst das Alte, dann das Neue zeigen
  for (let k = 0; k + 1 < segs.length; k++) {
    if (segs[k].op === 'ins' && segs[k + 1].op === 'del') [segs[k], segs[k + 1]] = [segs[k + 1], segs[k]];
  }
  return segs;
}

// Zahl der Änderungsstellen: zusammenhängende del/ins-Blöcke
export function countEdits(segs) {
  let n = 0, inEdit = false;
  for (const s of segs) {
    const edit = s.op !== 'same' && /\S/.test(s.t);
    if (edit && !inEdit) n++;
    inEdit = edit || (inEdit && s.op !== 'same');
  }
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
