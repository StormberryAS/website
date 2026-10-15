#!/usr/bin/env bash
# Compile the site's TypeScript (ts/) into the JavaScript the pages load.
#
#   tools/build-ts.sh           install the pinned compiler, compile every ts/*.ts (the .d.ts
#                               files hold types only) into the .js of the same name at the
#                               repository root, then run bump_assets.py so every page carries
#                               the current ?v= stamp
#   tools/build-ts.sh --force   the same, but overwrite a compiled .js even when it holds a hand
#                               edit (see below)
#   tools/build-ts.sh --check   change nothing in the site: fail when a compiled .js is missing,
#                               is not tracked by git, or is not byte for byte what ts/ compiles
#                               to (someone edited the .js by hand, or forgot to build), or when a
#                               page carries a stale ?v=
#
# The compiled .js files are committed on purpose: GitHub Pages and the nsite publish the
# repository's files as they are, with no build step of their own. Edit ts/*.ts, never the .js.
#
# Hand edits. A build never overwrites a compiled .js silently. It writes only when the .js now
# at the root is one that some ts/ source produced: what the committed ts/ (HEAD) compiles to,
# what the current ts/ compiles to, or what this script wrote last time (its record lives in the
# git directory, so it is never committed or published). Anything else is an edit made in the .js
# itself: the build stops and writes nothing. Port the edit into ts/ and build again, or rerun
# with --force to drop it. After a compiler upgrade the committed .js matches none of the three
# either; --force is right there, once the diff has been read.
#
# The compiler is the exact version in package-lock.json, installed with `npm ci` (a frozen
# install: it never resolves a new version, and fails if package.json and the lockfile disagree)
# and with install scripts off. Needs Node and npm (Node 24 on the Dell), python3, and git for
# the hand-edit guard and the tracked-file check (both are skipped outside a git checkout).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

case "$#:${1:-}" in
  0:)        MODE=build ;;
  1:--force) MODE=force ;;
  1:--check) MODE=check ;;
  *)         echo "usage: $0 [--check | --force]" >&2; exit 2 ;;
esac

die() { echo "build-ts: $*" >&2; exit 1; }
command -v node >/dev/null || die "node not found"
command -v npm >/dev/null || die "npm not found"
command -v python3 >/dev/null || die "python3 not found"
GIT=0
if command -v git >/dev/null && [ "$(git rev-parse --show-toplevel 2>/dev/null)" = "$ROOT" ]; then GIT=1; fi

npm ci --ignore-scripts --no-audit --no-fund --prefer-offline --loglevel=error >/dev/null \
  || die "npm ci failed (package.json and package-lock.json must agree; nothing was compiled)"
TSC=(node "$ROOT/node_modules/typescript/bin/tsc")
echo "build-ts: TypeScript $("${TSC[@]}" --version | sed 's/^Version //')"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Compile the current ts/ into a scratch folder first. Nothing at the root is touched unless
# all of ts/ compiles and every check below passes.
"${TSC[@]}" -p "$ROOT/tsconfig.json" --outDir "$tmp/out" || die "ts/ does not compile; nothing was written"

# The outputs are every file tsc emitted, and they must be exactly one .js per ts/*.ts.
mapfile -t OUTPUTS < <(cd "$tmp/out" && find . -type f -printf '%P\n' | LC_ALL=C sort)
mapfile -t EXPECTED < <(cd ts && find . -type f -name '*.ts' ! -name '*.d.ts' -printf '%P\n' | sed 's/\.ts$/.js/' | LC_ALL=C sort)
[ "${#OUTPUTS[@]}" -gt 0 ] || die "tsc emitted nothing"
[ "${OUTPUTS[*]}" = "${EXPECTED[*]}" ] \
  || die "tsc emitted [${OUTPUTS[*]}] but ts/ holds sources for [${EXPECTED[*]}]; look at tsconfig.json"

tracked() { [ "$GIT" = 1 ] && git ls-files --error-unmatch -- "$1" >/dev/null 2>&1; }

if [ "$MODE" = check ]; then
  bad=0
  [ "$GIT" = 1 ] || echo "build-ts: not a git checkout; skipping the tracked-file check"
  for f in "${OUTPUTS[@]}"; do
    if [ ! -f "$f" ]; then
      echo "build-ts: $f is missing: run tools/build-ts.sh" >&2; bad=1
    elif ! cmp -s "$tmp/out/$f" "$f"; then
      echo "build-ts: $f is NOT what ts/ compiles to: edit ts/, then run tools/build-ts.sh" >&2; bad=1
    elif [ "$GIT" = 1 ] && ! tracked "$f"; then
      echo "build-ts: $f is what ts/ compiles to but is not tracked by git: git add it (and add it to bump_assets.py if a page loads it)" >&2; bad=1
    else
      echo "build-ts: $f matches ts/"
    fi
  done
  python3 "$ROOT/bump_assets.py" --check || bad=1
  [ "$bad" = 0 ] || exit 1
  echo "build-ts: check passed"
  exit 0
fi

sha() { sha256sum < "$1" | cut -d' ' -f1; }
STATE=""
[ "$GIT" = 1 ] && STATE="$(git rev-parse --absolute-git-dir)/build-ts.last"

if [ "$MODE" = build ]; then
  # What the committed ts/ compiles to, with the committed tsconfig.json.
  if [ "$GIT" = 1 ] && git cat-file -e HEAD:tsconfig.json 2>/dev/null && git cat-file -e HEAD:ts 2>/dev/null; then
    mkdir -p "$tmp/head"
    git archive HEAD tsconfig.json ts | tar -x -C "$tmp/head"
    "${TSC[@]}" -p "$tmp/head/tsconfig.json" --outDir "$tmp/head-out" >/dev/null 2>&1 || true
  fi
  hand=()
  for f in "${OUTPUTS[@]}"; do
    [ -f "$f" ] || continue                       # a new output: nothing to lose
    cur="$(sha "$f")"
    [ "$cur" = "$(sha "$tmp/out/$f")" ] && continue
    [ -f "$tmp/head-out/$f" ] && [ "$cur" = "$(sha "$tmp/head-out/$f")" ] && continue
    [ -n "$STATE" ] && [ -f "$STATE" ] && grep -qxF "$cur  $f" "$STATE" && continue
    hand+=("$f")
  done
  if [ "${#hand[@]}" -gt 0 ]; then
    for f in "${hand[@]}"; do
      echo "build-ts: $f holds changes that no ts/ source produced (edited by hand?)" >&2
    done
    die "nothing was written. Port the change into ts/ (git diff and git log -p show it), then build again; or run tools/build-ts.sh --force to overwrite it."
  fi
fi

wrote=0
for f in "${OUTPUTS[@]}"; do
  if [ -f "$f" ] && cmp -s "$tmp/out/$f" "$f"; then continue; fi
  mkdir -p "$(dirname "$f")"
  cp "$tmp/out/$f" "$f"
  echo "build-ts: wrote $f"
  wrote=1
  if [ "$GIT" = 1 ] && ! tracked "$f"; then
    echo "build-ts: $f is new: git add it, and add it to ASSETS in bump_assets.py if a page loads it" >&2
  fi
done
[ "$wrote" = 1 ] || echo "build-ts: compiled output unchanged"
if [ -n "$STATE" ]; then
  for f in "${OUTPUTS[@]}"; do printf '%s  %s\n' "$(sha "$f")" "$f"; done > "$STATE"
fi

# Always: bump_assets.py changes nothing when every stamp is current, and repairs a stale one
# even when the compiled output did not change.
python3 "$ROOT/bump_assets.py"
