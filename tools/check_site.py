"""Prüft alle Seiten: Markup geschlossen, interne Links, Anker und Dateien vorhanden,
Kopf/Fuß aktuell, keine persönlichen Daten. Aufruf: python3 tools/check_site.py"""
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOID = {"meta", "link", "br", "img", "input", "hr", "base", "source", "wbr", "area", "col", "embed", "track",
        "path", "rect", "ellipse", "circle", "line", "polyline", "polygon", "stop"}
PRIVATE = ()


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.ids, self.refs, self.errors = [], set(), [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        for key in ("href", "src"):
            if a.get(key) and tag in ("a", "link", "script", "img", "source"):
                self.refs.append(a[key])
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append(f"</{tag}> passt nicht zu {self.stack[-3:]}")


def main():
    errors = []
    pages = {}
    for f in sorted(ROOT.glob("*.html")):
        p = Page()
        p.feed(f.read_text())
        if p.errors or p.stack:
            errors.append(f"{f.name}: {p.errors[:2]} offen: {p.stack[-3:]}")
        pages[f.name] = p
    for name, p in pages.items():
        for ref in p.refs:
            if ref.startswith(("http://", "https://", "mailto:", "data:")):
                continue
            path, _, frag = ref.partition("#")
            path = path.split("?")[0]
            target = name if path == "" else "index.html" if path == "./" else path
            if not (ROOT / target).is_file():
                errors.append(f"{name}: fehlt {ref}")
            elif frag and target.endswith(".html") and frag not in pages[target].ids:
                errors.append(f"{name}: Anker fehlt {ref}")
    for f in ROOT.rglob("*"):
        if f.is_file() and f.suffix in (".html", ".js", ".css", ".xml", ".json", ".md") and ".git" not in f.parts:
            low = f.read_text(errors="ignore").lower()
            errors += [f"{f.relative_to(ROOT)}: persönliche Angabe {w}" for w in PRIVATE if w in low]
    r = subprocess.run([sys.executable, str(ROOT / "tools/layout.py"), "--check"], capture_output=True, text=True)
    if r.returncode:
        errors.append(r.stderr.strip() or r.stdout.strip())
    if errors:
        sys.exit("FEHLER\n" + "\n".join(errors))
    print(f"ok: {len(pages)} Seiten")


if __name__ == "__main__":
    main()
