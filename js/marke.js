// Marke: HEX kopieren und aktuellen Abschnitt im Seitenmenü markieren
const status = document.getElementById('copy-status');

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback ohne Clipboard-API (z. B. ältere Browser, unsichere Kontexte)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* bleibt false */ }
    ta.remove();
    return ok;
  }
}

for (const btn of document.querySelectorAll('button[data-copy]')) {
  const lbl = btn.querySelector('.lbl');
  btn.addEventListener('click', async () => {
    const hex = btn.dataset.copy;
    const ok = await copyText(hex);
    btn.focus();
    // erst leeren, dann im nächsten Frame setzen, damit gleiche Meldungen erneut vorgelesen werden
    status.textContent = '';
    const msg = ok ? `${hex} kopiert` : `Kopieren nicht möglich. Bitte ${hex} von Hand markieren.`;
    requestAnimationFrame(() => { status.textContent = msg; });
    if (!ok) return;
    lbl.textContent = 'Kopiert';
    clearTimeout(btn.timer);
    btn.timer = setTimeout(() => { lbl.textContent = 'HEX kopieren'; }, 1800);
  });
}

const links = new Map([...document.querySelectorAll('.side a[href^="#"]')].map((a) => [a.hash.slice(1), a]));
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      for (const [id, a] of links) {
        if (id === en.target.id) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-15% 0px -75% 0px' });
  for (const id of links.keys()) io.observe(document.getElementById(id));
}
