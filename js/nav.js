// Ausklappmenüs: immer nur eins offen, zu bei Klick daneben oder Escape
const menus = [...document.querySelectorAll('details.dd, details.mnav')];
for (const d of menus) {
  d.addEventListener('toggle', () => {
    if (d.open) for (const o of menus) if (o !== d) o.open = false;
  });
}
document.addEventListener('click', (e) => {
  for (const d of menus) if (d.open && !d.contains(e.target)) d.open = false;
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (const d of menus) {
    if (d.open) {
      d.open = false;
      d.querySelector('summary').focus();
    }
  }
});
