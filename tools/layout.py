"""Überträgt Kopf- und Fußzeile aus tools/layout.html in die Seiten.

python3 tools/layout.py            # alle Seiten mit Markierungen
python3 tools/layout.py a.html     # nur diese Seiten
python3 tools/layout.py --check    # nur prüfen, Exit 1 bei Abweichung
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TPL = (ROOT / "tools/layout.html").read_text()
BLOCKS = {k: re.search(f"<!-- {k} -->\n(.*?)<!-- /{k} -->", TPL, re.S).group(1) for k in ("header", "footer")}
GROUPS = {
    "funktionsweise.html": "wie", "modell.html": "wie", "training.html": "wie", "daten.html": "wie",
    "testraum.html": "probe", "duell.html": "probe", "spickzettel.html": "probe",
}


def render(kind, page):
    out = BLOCKS[kind]
    if kind == "header":
        href = "./" if page == "index.html" else page
        out = out.replace(f'href="{href}">', f'href="{href}" aria-current="page">')
        if page in GROUPS:
            out = out.replace(f'class="dd" data-group="{GROUPS[page]}"', f'class="dd cur" data-group="{GROUPS[page]}"')
    return out


def sync(path, check=False):
    s = path.read_text()
    new = s
    for kind in BLOCKS:
        new = re.sub(f"(<!-- layout:{kind} -->\n).*?(<!-- /layout:{kind} -->)",
                     lambda m: m.group(1) + render(kind, path.name) + m.group(2), new, flags=re.S)
    if new == s:
        return True
    if not check:
        path.write_text(new)
    return False


def pages():
    return sorted(p for p in ROOT.glob("*.html") if "<!-- layout:header -->" in p.read_text())


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--check"]
    check = "--check" in sys.argv
    targets = [ROOT / a for a in args] or pages()
    stale = [p.name for p in targets if not sync(p, check)]
    if check and stale:
        sys.exit(f"Kopf/Fuß veraltet: {', '.join(stale)} → python3 tools/layout.py")
    print(("veraltet: " if check else "aktualisiert: ") + (", ".join(stale) or "nichts"))
