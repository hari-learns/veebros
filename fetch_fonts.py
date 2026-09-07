#!/usr/bin/env python3
"""Self-host the two typefaces. No third-party request, no layout shift."""
import os, re, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "fonts")
CSS = ("https://fonts.googleapis.com/css2"
       "?family=Inter:wght@300..800"
       "&family=JetBrains+Mono:wght@400;500&display=swap")
CHROME = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


def get(url):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": CHROME}), timeout=60).read()


os.makedirs(OUT, exist_ok=True)
css = get(CSS).decode()
found = {}
for subset, block in re.findall(r"/\*\s*([\w\-\[\]]+)\s*\*/\s*(@font-face\s*\{[^}]+\})", css):
    if subset != "latin":
        continue
    fam = re.search(r"font-family:\s*'([^']+)'", block)
    src = re.search(r"url\((https://[^)]+\.woff2)\)", block)
    if fam and src:
        found[fam.group(1).lower().replace(" ", "-")] = src.group(1)

for name, url in found.items():
    dest = os.path.join(OUT, name + ".woff2")
    blob = get(url)
    open(dest, "wb").write(blob)
    print(f"  {name:<18} {len(blob)//1024:>4} KB")
print(f"\n{len(found)} fonts -> fonts/")
