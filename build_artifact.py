#!/usr/bin/env python3
"""Fold the built site into one self-contained HTML file for a Claude Artifact.

An artifact is a single document with no sibling files, so the stylesheet,
both scripts and the two typefaces all have to travel inside it. Three.js is
the one thing left external — jsdelivr is on the artifact CSP allowlist, and
inlining 150 KB of library would be silly.

    python3 build_artifact.py   ->  artifact.html
"""
import base64
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(p):
    return open(os.path.join(ROOT, p), encoding="utf-8").read()


def font_face(family, filename, weights):
    b64 = base64.b64encode(open(os.path.join(ROOT, "fonts", filename), "rb").read()).decode()
    return (f"@font-face{{font-family:\"{family}\";"
            f"src:url(data:font/woff2;base64,{b64}) format(\"woff2\");"
            f"font-weight:{weights};font-display:swap;font-style:normal}}")


def main():
    html = read("index.html")
    css = read("styles.css")
    js = read("script.js")
    scene = read("scene.js")

    # the artifact host owns <html>/<head>/<body>, so take only the contents
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)

    # strip the tags that referenced sibling files; everything is inline now
    body = re.sub(r'<script src="script\.js[^"]*"[^>]*></script>', "", body)
    body = re.sub(r'<script type="module">\s*//[^\n]*\n\s*addEventListener\("load".*?</script>',
                  "", body, flags=re.S)

    # #top lived on <html>, which we no longer control
    body = body.replace('<a class="skip"', '<span id="top"></span>\n<a class="skip"', 1)

    # the two typefaces ride along as data URIs rather than sibling files
    faces = (font_face("Inter", "inter.woff2", "300 800")
             + font_face("JetBrains Mono", "jetbrains-mono.woff2", "400 500"))
    css = re.sub(r"@font-face\{[^}]*\}", "", css, count=2)

    out = f"""<title>Veebros</title>
<script type="importmap">
{{"imports":{{
  "three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
}}}}
</script>
<style>
{faces}
{css}
</style>
{body}
<script>
{js}
</script>
<script type="module">
{scene}
</script>
"""
    dest = os.path.join(ROOT, "artifact.html")
    open(dest, "w", encoding="utf-8").write(out)

    kb = len(out.encode()) / 1024
    print(f"  artifact.html  {kb:.0f} KB")
    for name, ok in [
        ("no <html>/<head>/<body>", not re.search(r"<(html|head|body)[ >]", out)),
        ("has <title>", "<title>" in out),
        ("fonts embedded", out.count("data:font/woff2") == 2),
        ("no sibling refs", 'href="styles.css' not in out and 'src="script.js' not in out),
        ("three via jsdelivr", "cdn.jsdelivr.net/npm/three" in out),
        ("scene included", "GLYPHS" in out),
        ("modal included", "data-modal" in out),
    ]:
        print(f"  {'PASS' if ok else 'FAIL'}  {name}")
        assert ok, name


if __name__ == "__main__":
    main()
