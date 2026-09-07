#!/usr/bin/env python3
"""Generate the Veebros concept site. Generator only — copy lives in content.py."""
import hashlib
import html
import json
import os

import content as C

ROOT = os.path.dirname(os.path.abspath(__file__))


def esc(s):
    return html.escape(str(s), quote=True)


def version(path):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        return "0"
    return hashlib.sha256(open(full, "rb").read()).hexdigest()[:12]


CSS_V, JS_V = version("styles.css"), version("script.js")
SCENE_V = version("scene.js")


def wa(text=""):
    base = "https://wa.me/" + C.WHATSAPP
    return base + ("?text=" + html.escape(text.replace(" ", "%20"), quote=True) if text else "")


def header():
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="hdr" data-header>
  <div class="wrap hdr__in">
    <a class="brand" href="#top" aria-label="{esc(C.NAME)}, home">
      <svg class="brand__mark" viewBox="0 0 28 28" width="22" height="22" aria-hidden="true">
        <path d="M4 5 L14 23 L24 5" fill="none" stroke="currentColor"
              stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="brand__name">{esc(C.NAME)}</span>
    </a>
    <button class="btn btn--sm" type="button" data-open-modal>Start an idea</button>
  </div>
</header>'''


def footer():
    note = (f'<p class="foot__note">{C.FOOTER_NOTE}</p>'
            if C.SHOW_CONCEPT_NOTE else "")
    return f'''
<footer class="foot" id="contact">
  <div class="wrap foot__base">
    <p>&copy; 2026 {esc(C.LEGAL_NAME)} &middot; {esc(C.LOCATION)}</p>
    {note}
  </div>
</footer>'''


def page(path, title, description, body, extra=""):
    robots = "noindex, nofollow" if C.NOINDEX else "index, follow"
    doc = f'''<!doctype html>
<html lang="en" id="top">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="{robots}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#FBFBF9">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css?v={CSS_V}">
<script type="importmap">
{{"imports":{{
  "three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
}}}}
</script>
</head>
<body>
<div class="scene" data-scene aria-hidden="true"></div>
{header()}
<main id="main">
{body}
</main>
{extra}
{footer()}
<script src="script.js?v={JS_V}" defer></script>
<script type="module">
  // after first paint: the hero must never wait on 150 KB of WebGL
  addEventListener("load", () => {{ import("./scene.js?v={SCENE_V}"); }});
</script>
</body>
</html>'''
    open(os.path.join(ROOT, path), "w", encoding="utf-8").write(doc)
    return path


def idea_modal():
    """Two fields. Anything more is a form, and a form is a proposal."""
    return f'''
<div class="scrim" data-scrim data-modal-close hidden></div>
<div class="modal" data-modal data-wa="{C.WHATSAPP}" hidden>
  <div class="modal__panel" role="dialog" aria-modal="true"
       aria-labelledby="modal-title">
    <button class="modal__x" type="button" data-modal-close aria-label="Close">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M5 5l14 14M19 5L5 19"/>
      </svg>
    </button>

    <div class="modal__stage" data-modal-form>
      <p class="kicker">Start an idea</p>
      <h2 class="h2" id="modal-title">Two fields.<br>That is the whole brief.</h2>
      <form class="mform" data-idea-form novalidate>
        <div class="fl fl--area" data-fl>
          <div class="fl__box">
            <textarea class="fl__input" id="f-idea" name="idea" rows="3"
              required data-field placeholder=" "></textarea>
          </div>
          <label class="fl__label" for="f-idea">What do you want built?</label>
        </div>
        <div class="fl" data-fl>
          <div class="fl__box">
            <input class="fl__input" id="f-wa" name="wa" type="tel" required
              data-field autocomplete="tel" placeholder=" ">
          </div>
          <label class="fl__label" for="f-wa">WhatsApp number</label>
        </div>
        <button class="btn btn--lg btn--block" type="submit">Send it</button>
      </form>
    </div>

    <div class="modal__stage modal__done" data-modal-done hidden>
      <h2 class="h2">The idea is cool,<br>just like you.</h2>
      <p class="lede">See it in life soon.</p>
      <button class="btn btn--ghost" type="button" data-modal-close>Close</button>
    </div>
  </div>
</div>'''


def build_home():
    seeds = "".join(
        f'<button class="seed" type="button" data-seed>{esc(s)}</button>'
        for s in C.SEEDS)

    steps = "".join(
        f'<li class="step" data-step="{i}"><span class="step__dot"></span>'
        f'<span class="step__txt">{s}</span></li>'
        for i, s in enumerate(C.BUILD_STEPS))

    rail = "".join(
        f'''<li class="tl" data-reveal style="--i:{i}">
  <div class="tl__time"><span>{t}</span></div>
  <div class="tl__body"><h3>{h}</h3><p>{p}</p></div>
</li>''' for i, (t, h, p) in enumerate(C.TIMELINE))

    rng = "".join(
        f'<li class="rng" data-reveal style="--i:{i % 4}"><h3>{n}</h3><p>{d}</p></li>'
        for i, (n, d) in enumerate(C.RANGE))

    thesis = "".join(f"<p>{p}</p>" for p in C.THESIS_BODY)

    faq = "".join(
        f'<details class="faq"><summary>{q}</summary><p>{a}</p></details>'
        for q, a in C.FAQ)

    # The archetype library the demo machine matches against. Kept here so the
    # patterns and the copy stay in one place.
    archetypes = json.dumps(ARCHETYPES, separators=(",", ":"))

    who = "".join(
        f'<div class="who" data-reveal style="--i:{i}"><h3>{n}</h3><p>{d}</p></div>'
        for i, (n, d) in enumerate(C.WHO))

    body = f'''
<section class="hero">
  <div class="wrap">
    <p class="kicker" data-reveal>{C.HERO_KICKER}</p>
    <h1 class="h1" data-reveal style="--i:1">{C.HERO_TITLE}</h1>
    <p class="hero__sub lede" data-reveal style="--i:2">{C.HERO_SUB}</p>
    <div class="hero__act" data-reveal style="--i:3">
      <button class="btn btn--lg" type="button" data-open-modal>{C.HERO_CTA}</button>
      <a class="btn btn--lg btn--ghost" href="#build">{C.HERO_CTA_2}</a>
    </div>
    <div class="whos">{who}</div>
  </div>
</section>

<section class="sec" id="build">
  <div class="wrap">
    <p class="kicker" data-reveal>{C.MACHINE_KICKER}</p>
    <h2 class="h2" data-reveal style="--i:1">{C.MACHINE_TITLE}</h2>
    <p class="lede" data-reveal style="--i:2">{C.MACHINE_SUB}</p>

    <div class="machine" data-machine data-archetypes="{esc(archetypes)}"
         data-wa="{C.WHATSAPP}" data-reveal style="--i:3">
      <form class="machine__form" data-machine-form>
        <label class="machine__label" for="idea">{C.INPUT_LABEL}</label>
        <div class="machine__row">
          <input class="machine__input" id="idea" name="idea" type="text"
                 autocomplete="off" placeholder="{esc(C.INPUT_PLACEHOLDER)}"
                 data-machine-input>
          <button class="btn machine__go" type="submit" data-machine-go>
            <span>Build it</span>
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"
                 fill="none" stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h13M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div class="seeds" aria-label="Example ideas">{seeds}</div>
      </form>

      <div class="machine__stage" data-machine-stage hidden>
        <ol class="steps" data-machine-steps aria-live="polite">{steps}</ol>
        <div class="canvas" data-machine-canvas role="img"
               aria-label="A rough three-screen sketch of the product"></div>
        <div class="machine__after" data-machine-after hidden>
          <h2 class="h3">{C.AFTER_BUILD_TITLE}</h2>
          <p>{C.AFTER_BUILD_BODY}</p>
          <div class="machine__act">
            <button class="btn" type="button" data-open-modal>{C.AFTER_BUILD_CTA}</button>
            <button class="btn btn--ghost" type="button" data-machine-again>
              Try another idea
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="sec sec--thesis" id="why">
  <div class="wrap wrap--narrow">
    <p class="kicker" data-reveal>{C.THESIS_KICKER}</p>
    <h2 class="h2 thesis__title" data-reveal style="--i:1">{C.THESIS_TITLE}</h2>
    <div class="prose" data-reveal style="--i:2">{thesis}</div>
  </div>
</section>

<section class="sec sec--tl" id="how" data-timeline>
  <div class="wrap">
    <div class="tl__head">
      <p class="kicker" data-reveal>{C.TIMELINE_KICKER}</p>
      <h2 class="h2" data-reveal style="--i:1">{C.TIMELINE_TITLE}</h2>
    </div>
    <div class="tl__grid">
      <div class="clock" aria-hidden="true">
        <svg class="clock__dial" viewBox="0 0 100 100" width="132" height="132">
          <circle cx="50" cy="50" r="46" class="clock__rim"/>
          <g class="clock__ticks">
            <line x1="50" y1="8"  x2="50" y2="15"/>
            <line x1="92" y1="50" x2="85" y2="50"/>
            <line x1="50" y1="92" x2="50" y2="85"/>
            <line x1="8"  y1="50" x2="15" y2="50"/>
          </g>
          <line class="clock__hand clock__hand--h" x1="50" y1="50" x2="50" y2="28"/>
          <line class="clock__hand clock__hand--m" x1="50" y1="50" x2="50" y2="18"/>
          <line class="clock__hand clock__hand--s" x1="50" y1="56" x2="50" y2="14"/>
          <circle cx="50" cy="50" r="3.2" class="clock__pin"/>
        </svg>
        <p class="clock__cap">forty-eight hours</p>
      </div>
      <ol class="tl__list">{rail}</ol>
    </div>
  </div>
</section>

<section class="sec" id="range">
  <div class="wrap">
    <p class="kicker" data-reveal>{C.RANGE_KICKER}</p>
    <h2 class="h2" data-reveal style="--i:1">{C.RANGE_TITLE}</h2>
    <p class="lede" data-reveal style="--i:2">{C.RANGE_BODY}</p>
    <ul class="rngs">{rng}</ul>
  </div>
</section>

<section class="close" id="start">
  <div class="wrap wrap--narrow close__in" data-reveal>
    <p class="kicker">{C.CLOSE_KICKER}</p>
    <h2 class="h2">{C.CLOSE_TITLE}</h2>
    <p class="close__said">{C.CLOSE_BODY}</p>
    <blockquote class="close__quote"><p>{C.CLOSE_QUOTE}</p></blockquote>
    <button class="btn btn--lg" type="button" data-open-modal>{C.CLOSE_CTA}</button>
  </div>
</section>

<section class="sec sec--faq" id="faq">
  <div class="wrap wrap--narrow">
    <h2 class="h2" data-reveal>Questions</h2>
    <div class="faqs" data-reveal style="--i:1">{faq}</div>
  </div>
</section>

<section class="signoff" aria-hidden="true">
  <p class="signoff__cap">Veebros</p>
</section>'''
    return page("index.html", C.PAGE_TITLE, C.DESCRIPTION, body,
                extra=idea_modal())


def build_404():
    body = '''
<section class="close" style="min-height:70svh;display:flex;align-items:center">
  <div class="wrap wrap--narrow close__in">
    <p class="kicker">404</p>
    <h1 class="h1">Not built yet.</h1>
    <p class="lede">That page does not exist. Most things do not, until
      someone asks for them.</p>
    <a class="btn btn--lg" href="index.html">Ask for something</a>
  </div>
</section>'''
    return page("404.html", f"Page not found — {C.NAME}",
                "That page could not be found.", body)


# The demo machine's pattern library. Each archetype: matching keywords, a
# label, a device frame, and the screens it assembles.
ARCHETYPES = [
    dict(id="booking", label="Booking &amp; scheduling", device="phone",
         match=["book", "appoint", "schedul", "slot", "reserv", "clinic",
                "dentist", "dental", "salon", "spa", "doctor", "consult",
                "table", "calendar", "session"],
         screens=[
             dict(t="Pick a service", rows=["list", "list", "list"]),
             dict(t="Choose a time", rows=["cal", "chips", "chips"]),
             dict(t="Confirm", rows=["summary", "field", "cta"]),
         ]),
    dict(id="marketplace", label="Marketplace", device="phone",
         match=["marketplace", "rent", "listing", "classified", "buyer",
                "seller", "hire", "gear", "peer", "match", "platform for"],
         screens=[
             dict(t="Browse", rows=["search", "grid", "grid"]),
             dict(t="Listing", rows=["hero", "meta", "cta"]),
             dict(t="Book it", rows=["cal", "summary", "cta"]),
         ]),
    dict(id="dashboard", label="Internal dashboard", device="desktop",
         match=["dashboard", "analytic", "report", "admin", "internal",
                "metric", "kpi", "team", "ops", "monitor", "overview"],
         screens=[
             dict(t="Overview", rows=["kpis", "chart", "table"]),
             dict(t="Detail", rows=["chart", "table"]),
             dict(t="Filters", rows=["chips", "table"]),
         ]),
    dict(id="store", label="Storefront", device="phone",
         match=["store", "shop", "ecommerce", "e-commerce", "sell", "product",
                "bakery", "cart", "checkout", "catalog", "boutique", "order online"],
         screens=[
             dict(t="Shop", rows=["search", "grid", "grid"]),
             dict(t="Product", rows=["hero", "meta", "cta"]),
             dict(t="Checkout", rows=["summary", "field", "cta"]),
         ]),
    dict(id="tracker", label="Tracker", device="phone",
         match=["track", "log", "habit", "gym", "fitness", "progress",
                "diary", "journal", "workout", "weight", "spreadsheet", "record"],
         screens=[
             dict(t="Today", rows=["ring", "list", "list"]),
             dict(t="Add entry", rows=["field", "chips", "cta"]),
             dict(t="Progress", rows=["chart", "kpis"]),
         ]),
    dict(id="course", label="Course platform", device="desktop",
         match=["course", "lms", "learn", "student", "training", "lesson",
                "teach", "class", "tutor", "curriculum", "academy"],
         screens=[
             dict(t="Courses", rows=["search", "grid", "grid"]),
             dict(t="Lesson", rows=["hero", "list", "cta"]),
             dict(t="Progress", rows=["kpis", "chart"]),
         ]),
    dict(id="crm", label="CRM &amp; pipeline", device="desktop",
         match=["crm", "lead", "pipeline", "sales", "deal", "prospect",
                "follow up", "follow-up", "contact"],
         screens=[
             dict(t="Pipeline", rows=["kanban"]),
             dict(t="Contact", rows=["hero", "meta", "list"]),
             dict(t="Activity", rows=["list", "list", "cta"]),
         ]),
    dict(id="clinic", label="Patient system", device="desktop",
         match=["patient", "hospital", "medical", "health", "pharmacy",
                "prescription", "diagnos", "ward"],
         screens=[
             dict(t="Patients", rows=["search", "table"]),
             dict(t="Record", rows=["hero", "meta", "list"]),
             dict(t="Appointments", rows=["cal", "list"]),
         ]),
    dict(id="delivery", label="Delivery &amp; logistics", device="phone",
         match=["deliver", "logistic", "fleet", "driver", "courier", "route",
                "dispatch", "shipment", "parcel", "cargo", "truck"],
         screens=[
             dict(t="Jobs", rows=["chips", "list", "list"]),
             dict(t="Route", rows=["map", "meta", "cta"]),
             dict(t="Proof", rows=["field", "cta"]),
         ]),
    dict(id="invoice", label="Invoicing", device="desktop",
         match=["invoic", "billing", "account", "payment", "gst", "ledger",
                "expense", "quote", "receipt"],
         screens=[
             dict(t="Invoices", rows=["kpis", "table"]),
             dict(t="New invoice", rows=["field", "table", "cta"]),
             dict(t="Chasing", rows=["chips", "list"]),
         ]),
    dict(id="social", label="Community", device="phone",
         match=["social", "community", "forum", "feed", "chat", "message",
                "group", "member", "network", "post"],
         screens=[
             dict(t="Feed", rows=["post", "post"]),
             dict(t="Profile", rows=["hero", "meta", "grid"]),
             dict(t="Compose", rows=["field", "chips", "cta"]),
         ]),
    dict(id="generic", label="Custom application", device="phone",
         match=[],
         screens=[
             dict(t="Home", rows=["search", "list", "list"]),
             dict(t="Detail", rows=["hero", "meta", "cta"]),
             dict(t="Create", rows=["field", "field", "cta"]),
         ]),
]


if __name__ == "__main__":
    made = [build_home(), build_404()]
    print(f"built {len(made)} pages")
    for p in made:
        print("  " + p)
    if C.NOINDEX:
        print("\n  noindex is ON (concept build)")
