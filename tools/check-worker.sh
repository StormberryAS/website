#!/usr/bin/env bash
# Check the contact-form Worker (cloudflare-worker/) before a commit or a deploy.
#
#   tools/check-worker.sh
#
# wrangler compiles cloudflare-worker/index.ts itself when it deploys, but it only strips the
# types and never checks them, so a type error would deploy without a word. This script changes
# nothing tracked by git (wrangler keeps its cache in cloudflare-worker/.wrangler/, git-ignored):
#   1. installs the pinned compiler (npm ci from package-lock.json, install scripts off), as
#      tools/build-ts.sh does;
#   2. type-checks the Worker with cloudflare-worker/tsconfig.json (strict, no emit);
#   3. runs the offline tests, node cloudflare-worker/test.mjs (Node 22.13 or later);
#   4. when wrangler is installed (it needs Node 22 or later): checks that
#      cloudflare-worker/worker-configuration.d.ts is what `wrangler types` generates from
#      wrangler.toml and the installed wrangler (`wrangler types --check`), then bundles the
#      Worker with `wrangler deploy --dry-run` into a scratch folder. Both run without
#      credentials: CLOUDFLARE_API_TOKEN and friends are removed from their environment and
#      HOME points at an empty scratch folder, so no stored login can be used either.
#
# When the types check fails (wrangler.toml changed, or wrangler was upgraded), regenerate:
#   cd cloudflare-worker && wrangler types
# and commit the new worker-configuration.d.ts. That needs no credentials and no network.
#
# wrangler is found as $WRANGLER_JS (a path to wrangler's bin/wrangler.js), else in the usual
# global install folders; it runs under the same node as the rest of this script.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
W="$ROOT/cloudflare-worker"

die() { echo "check-worker: $*" >&2; exit 1; }
[ "$#" = 0 ] || { echo "usage: $0" >&2; exit 2; }
command -v node >/dev/null || die "node not found"
command -v npm >/dev/null || die "npm not found"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

npm ci --ignore-scripts --no-audit --no-fund --prefer-offline --loglevel=error >/dev/null \
  || die "npm ci failed (package.json and package-lock.json must agree)"
TSC=(node "$ROOT/node_modules/typescript/bin/tsc")

"${TSC[@]}" -p "$W/tsconfig.json" || die "cloudflare-worker/index.ts does not type-check"
echo "check-worker: type check passed (TypeScript $("${TSC[@]}" --version | sed 's/^Version //'))"

node "$W/test.mjs" > "$tmp/test.log" 2>&1 \
  || { grep '^FAIL' "$tmp/test.log" >&2 || tail -n 20 "$tmp/test.log" >&2; die "the Worker tests fail"; }
echo "check-worker: tests $(tail -n 1 "$tmp/test.log")"

WRANGLER_JS="${WRANGLER_JS:-}"
if [ -n "$WRANGLER_JS" ] && [ ! -f "$WRANGLER_JS" ]; then die "WRANGLER_JS=$WRANGLER_JS is not a file"; fi
if [ -z "$WRANGLER_JS" ]; then
  for c in "$HOME/.npm-global/lib/node_modules/wrangler/bin/wrangler.js" \
           "$(npm root -g)/wrangler/bin/wrangler.js" \
           /usr/local/lib/node_modules/wrangler/bin/wrangler.js; do
    if [ -f "$c" ]; then WRANGLER_JS="$c"; break; fi
  done
fi
if [ -z "$WRANGLER_JS" ]; then
  echo "check-worker: wrangler not found: types and bundle NOT checked (set WRANGLER_JS)" >&2
  echo "check-worker: type check and tests passed"
  exit 0
fi
[ "$NODE_MAJOR" -ge 22 ] || die "wrangler needs Node 22 or later; this is $(node --version)"

mkdir -p "$tmp/home"
# No credentials and no stored login: a clean environment and an empty HOME.
wrangler() {
  (cd "$W" && env -i PATH="$PATH" HOME="$tmp/home" WRANGLER_SEND_METRICS=false CI=1 \
     node "$WRANGLER_JS" "$@")
}
echo "check-worker: wrangler $(wrangler --version 2>/dev/null | tail -n 1)"
wrangler types --check > "$tmp/types.log" 2>&1 \
  || { cat "$tmp/types.log" >&2; die "worker-configuration.d.ts is out of date: cd cloudflare-worker && wrangler types, then commit it"; }
echo "check-worker: worker-configuration.d.ts is up to date"
wrangler deploy --dry-run --outdir "$tmp/bundle" > "$tmp/bundle.log" 2>&1 \
  || { cat "$tmp/bundle.log" >&2; die "wrangler deploy --dry-run failed"; }
grep -q "^--dry-run: exiting now" "$tmp/bundle.log" || { cat "$tmp/bundle.log" >&2; die "wrangler deploy --dry-run did not finish"; }
echo "check-worker: bundle builds ($(wc -c < "$tmp/bundle/index.js") bytes; nothing deployed)"
echo "check-worker: check passed"
