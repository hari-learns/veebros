#!/usr/bin/env python3
"""Pre-flight checks. Run before sharing the link."""
import ast, os, re, sys
from html.parser import HTMLParser
import content as C

ROOT = os.path.dirname(os.path.abspath(__file__))
problems = []
def fail(m): problems.append(m)

class P(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]; self.assets=[]; self.imgs=[]; self.h1=0
        self.title=self.desc=self.robots=""; self._t=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=="a" and a.get("href"): self.links.append(a["href"])
        elif tag=="img":
            self.imgs.append((a.get("src",""), a.get("alt")))
            if a.get("src"): self.assets.append(a["src"])
        elif tag in ("link","script") and (a.get("href") or a.get("src")):
            self.assets.append(a.get("href") or a.get("src"))
        elif tag=="h1": self.h1+=1
        elif tag=="title": self._t=True
        elif tag=="meta":
            if a.get("name")=="description": self.desc=a.get("content","")
            elif a.get("name")=="robots": self.robots=a.get("content","")
    def handle_data(self,d):
        if self._t: self.title+=d
    def handle_endtag(self,tag):
        if tag=="title": self._t=False

def check_pages():
    # "_" prefixed files are throwaway scroll-position test pages
    pages=sorted(f for f in os.listdir(ROOT)
                 if f.endswith(".html") and not f.startswith("_"))
    if not pages: return fail("no HTML — run build.py")
    titles={}
    for n in pages:
        p=P(); p.feed(open(os.path.join(ROOT,n),encoding="utf-8").read())
        if p.h1!=1: fail(f"{n}: {p.h1} <h1> (want 1)")
        if not p.desc: fail(f"{n}: no meta description")
        if C.NOINDEX and "noindex" not in p.robots: fail(f"{n}: not noindex")
        titles.setdefault(p.title.strip(),[]).append(n)
        for src,alt in p.imgs:
            if alt is None: fail(f"{n}: <img> without alt: {src}")
        for r in set(p.assets):
            if r.startswith(("http","//","data:")): continue
            if not os.path.exists(os.path.join(ROOT,r.split("?")[0])):
                fail(f"{n}: missing asset {r}")
        for h in set(p.links):
            if h.startswith(("http","mailto:","tel:","#","//")): continue
            t=h.split("#")[0]
            if t and not os.path.exists(os.path.join(ROOT,t)):
                fail(f"{n}: broken link -> {h}")
    for t,ns in titles.items():
        if len(ns)>1: fail(f"duplicate <title> {t!r} on {ns}")
    print(f"  {len(pages)} pages checked")

def check_contrast():
    css=open(os.path.join(ROOT,"styles.css")).read()
    t=dict(re.findall(r"--([\w-]+):(#[0-9A-Fa-f]{6})",
                      re.search(r":root\{([^}]*)\}",css).group(1)))
    def lum(h):
        h=h.lstrip("#"); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
        c=[v/12.92 if v<=.03928 else ((v+.055)/1.055)**2.4 for v in c]
        return .2126*c[0]+.7152*c[1]+.0722*c[2]
    def r(a,b):
        la,lb=lum(a),lum(b); return (max(la,lb)+.05)/(min(la,lb)+.05)
    for a,b,what,floor in [("ink","bg","body",4.5),("muted","bg","secondary",4.5),
                           ("faint","bg","captions",3.0),("accent","bg","accent text",4.5),
                           ("on-accent","accent","button label",4.5),
                           ("muted","surface","secondary on surface",4.5)]:
        v=r(t[a],t[b])
        if v<floor: fail(f"{what} (--{a} on --{b}) {v:.2f}:1 below {floor}:1")
    print("  contrast AA passes")

def check_single_source():
    src=open(os.path.join(ROOT,"build.py")).read()
    doc=ast.get_docstring(ast.parse(src))
    if doc: src=src.replace(doc,"")
    for label,val in [("phone",C.PHONE),("email",C.EMAIL),("company",C.LEGAL_NAME)]:
        if val in src: fail(f"{label} {val!r} hard-coded in build.py")
    print("  build.py holds no content")

def check_machine():
    """The demo machine is the whole site; its data must be sound."""
    import build as B
    ids=[a["id"] for a in B.ARCHETYPES]
    if len(ids)!=len(set(ids)): fail("duplicate archetype id")
    if B.ARCHETYPES[-1]["match"]: fail("the last archetype must be the catch-all (empty match)")
    prims=set(re.findall(r"^\s*(\w+):\s*'",
              open(os.path.join(ROOT,"script.js")).read().split("var PRIMS")[1]
              .split("};")[0], re.M))
    for a in B.ARCHETYPES:
        if a["device"] not in ("phone","desktop"): fail(f"{a['id']}: bad device")
        if not a["screens"]: fail(f"{a['id']}: no screens")
        for s in a["screens"]:
            for row in s["rows"]:
                if row not in prims:
                    fail(f"{a['id']}/{s['t']}: row '{row}' has no primitive in script.js")
        # a keyword shorter than 3 chars will match half the dictionary
        for k in a["match"]:
            if len(k) < 3: fail(f"{a['id']}: keyword {k!r} is too short to be safe")
    print(f"  {len(B.ARCHETYPES)} archetypes, all rows have primitives")


def check_no_leaked_placeholders():
    """An f-string brace that was escaped by mistake renders as literal text.
    It is easy to miss in a long template and it ships as visible garbage."""
    import re
    bad = []
    for n in sorted(f for f in os.listdir(ROOT)
                    if f.endswith(".html") and not f.startswith("_")):
        html_txt = open(os.path.join(ROOT, n), encoding="utf-8").read()
        for m in set(re.findall(r"\{[A-Za-z_][A-Za-z0-9_.\[\]()]*\}", html_txt)):
            bad.append(f"{n}: {m}")
    if bad:
        fail(f"{len(bad)} un-substituted placeholder(s) in the output: "
             + ", ".join(sorted(bad)[:8]))
    else:
        print("  no leaked template placeholders")

if __name__=="__main__":
    print("verifying build\n")
    check_pages(); check_no_leaked_placeholders()
    check_contrast(); check_single_source(); check_machine()
    print()
    if problems:
        print(f"{len(problems)} PROBLEM(S):")
        for p in problems: print("  -",p)
        sys.exit(1)
    print("all checks passed")
    if C.NOINDEX: print("\nnote: pages are noindex (concept build)")
    if C.SHOW_CONCEPT_NOTE: print("note: placeholder-details banner is ON")
