#!/usr/bin/env python3
"""Stamp a content hash onto the cache-busting query string of the shared assets.

Why this exists
---------------
style.css, script.js and lucide.min.js are served with `cache-control: max-age=14400`
and their filenames never change, so a returning visitor keeps the old bytes for up to
four hours after a deploy. A Cloudflare purge does not help: it clears the edge, never a
browser. The query string IS part of the Cloudflare cache key on this zone (verified),
so bumping ?v= busts the edge and the browser in one move.

Keying on the file's own SHA-256 means a run that changes nothing produces no diff, so
this is safe to run before every commit and impossible to forget to bump.

Fonts are deliberately NOT handled here: they carry a version in the filename
(Inter-latin-v4001.woff2). If Inter is rebuilt, ship a new filename, never overwrite.

Usage:  python3 bump_assets.py [--check]
        --check exits 1 if any page is stale, without writing. For use before a commit.
"""

import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent

# (filename, the HTML attribute that references it)
ASSETS = [
    ("style.css", "href"),
    ("script.js", "src"),
    ("lucide.min.js", "src"),
]


def pages():
    return sorted(ROOT.glob("*.html")) + sorted((ROOT / "no").glob("*.html"))


def digest(name):
    return hashlib.sha256((ROOT / name).read_bytes()).hexdigest()[:8]


def main():
    check_only = "--check" in sys.argv
    hashes = {name: digest(name) for name, _ in ASSETS}
    patterns = {
        name: re.compile(r'%s="/%s(?:\?v=[^"]*)?"' % (attr, re.escape(name)))
        for name, attr in ASSETS
    }
    replacements = {
        name: '%s="/%s?v=%s"' % (attr, name, hashes[name])
        for name, attr in ASSETS
    }

    stale = []
    for page in pages():
        text = page.read_text(encoding="utf-8")
        updated = text
        for name, _ in ASSETS:
            updated = patterns[name].sub(replacements[name], updated)
        if updated != text:
            stale.append(page.relative_to(ROOT))
            if not check_only:
                page.write_text(updated, encoding="utf-8")

    label = "stale" if check_only else "updated"
    for name, _ in ASSETS:
        print("%-16s v=%s" % (name, hashes[name]))
    if stale:
        print("%d page(s) %s: %s" % (len(stale), label, ", ".join(str(p) for p in stale)))
    else:
        print("all pages already current")

    if check_only and stale:
        sys.exit(1)


if __name__ == "__main__":
    main()
