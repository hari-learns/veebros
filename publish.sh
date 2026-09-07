#!/usr/bin/env bash
# Build, verify, and publish ONLY the served files to the public repo.
#
# The source (this repo) is private. The public repo holds nothing but what a
# browser downloads anyway — no generator, no content system, no history.
#
#   ./publish.sh
set -euo pipefail
cd "$(dirname "$0")"

PUBLIC=hari-learns/veebros-concept
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

echo "==> build"
python3 build.py >/dev/null

echo "==> verify"
python3 verify.py   # refuses to publish a broken build

echo "==> stage the served files only"
# Anything not listed here never reaches the public repo.
cp *.html styles.css script.js scene.js favicon.svg .nojekyll "$STAGE/"
mkdir -p "$STAGE/fonts" && cp fonts/*.woff2 "$STAGE/fonts/"

cat > "$STAGE/README.md" <<'MD'
# Veebros — published build

The compiled site only. Source, generator and content system are private.

<https://hari-learns.github.io/veebros-concept/>
MD

# Guard: the source must never end up here by accident.
for leak in build.py content.py verify.py publish.sh fetch_fonts.py; do
  if [ -e "$STAGE/$leak" ]; then echo "REFUSING: $leak staged for the public repo"; exit 1; fi
done

echo "==> publish"
cd "$STAGE"
git init -q
git checkout -q -b main
git add -A
git -c user.name="Hariharan" -c user.email="hariharanrp.dev@gmail.com" \
    commit -q -m "Published build $(date -u +%Y-%m-%dT%H:%MZ)"
git remote add origin "https://github.com/$PUBLIC.git"
# single-commit history, so the public repo never accumulates source
git push -q --force origin main

echo
echo "published -> https://hari-learns.github.io/veebros-concept/"
echo "files:"
git ls-files | sed 's/^/  /'
