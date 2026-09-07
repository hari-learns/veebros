# Veebros — concept site

A one-page concept for **Veebros Info Solutions**. Send an idea, get a
working demo back in 48 hours, free.

**Live:** https://hari-learns.github.io/veebros-concept/

## The idea

Every other software company answers an idea with a *proposal*. Veebros
answers with the *software*. So the site doesn't describe that — it does it.

**The demo machine** in the hero takes a typed idea, classifies it against 12
product archetypes, and assembles a plausible product skeleton on screen in
about four seconds. Then it admits what it is:

> That took four seconds. It's a rough shape, assembled in your browser from
> a pattern we know well. Yours gets built properly.

That honesty is the point — it disarms rather than overclaims, and the CTA
hands the typed idea straight to WhatsApp.

It demonstrates itself on arrival (one silent run, no payoff copy) so a
visitor never faces an empty input wondering what the page does.

**Deliberately not mentioned anywhere: AI.** Naming the enabling technology
lets a visitor discount the offer. The argument is about *risk and sequence*
instead — you shouldn't have to buy software to find out whether you want it.

## ⚠️ Placeholders to replace

At the top of `content.py`:

- `PHONE` / `PHONE_LINK` / `WHATSAPP` — currently `+91 90000 00000`
- `EMAIL` — currently `hello@veebros.com`
- `DELIVERED` — an illustrative count, unused in the current layout

Then set `NOINDEX = False` and `SHOW_CONCEPT_NOTE = False` for the real site.

## Working on it

```bash
python3 build.py      # regenerate
python3 verify.py     # links, contrast, archetype data, single-source
python3 -m http.server 4324
```

All copy lives in `content.py`; `build.py` contains none and `verify.py`
fails the build if any creeps in.

### Adding a product archetype

Append to `ARCHETYPES` in `build.py`: an `id`, `match` keywords (3+ chars,
matched at word start), a `device` (`phone`/`desktop`), and `screens` whose
`rows` name primitives that exist in `PRIMS` in `script.js`. `verify.py`
checks that mapping.

| File | Purpose |
|---|---|
| `content.py` | All copy and contact details |
| `build.py` | Generator + the archetype library |
| `styles.css` | Tokens, layout, the mock primitives |
| `script.js` | The demo machine, the 48-hour clock, reveals |
| `verify.py` | Pre-flight checks |
