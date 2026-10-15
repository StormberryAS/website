# Stormberry Website

Source code for the Stormberry AS corporate website.

**Live:** [stormberry.as](https://stormberry.as)

## Architecture
- **Vanilla HTML/CSS**, no frameworks. The site's own scripts are written in **TypeScript** (`ts/`) and compiled to plain JavaScript (`script.js`, `calendar.js`) that is committed next to the pages, so GitHub Pages and the nsite still publish the repository as it is.
- **Privacy first**, no cookies, no trackers, no external dependencies that compromise user privacy.
- **Sovereign AI**, built and maintained using high-speed agentic workflows.

## Standard operating procedures

### Blog archiving
The blog follows a strict monthly archiving rule to keep the feed clean and the page fast:
1. `blog.html` MUST only contain posts for the **current month**.
2. Past months are archived in files named `blogYYYYMM.html` (for example, all April 2026 posts live in `blog202604.html`).
3. When a new month starts, create the archive file for the previous month, move all those posts into it, and leave only the new month's posts in `blog.html`.
4. All blog imagery MUST be stored in the `/pictures` directory to keep the root directory clean.

### Image management
- Use `1.91:1` aspect ratio (1200x628 minimum) for LinkedIn compatibility.
- **Blog/social images only:** generate them in a dark, cinematic, glassmorphism style. This art direction applies to generated post imagery — it is **not** the visual identity of the website itself, which is light and clean (off-white surfaces, charcoal text, a single red accent).

## Scripts (TypeScript)
Edit `ts/script.ts` or `ts/calendar.ts`, never the compiled `.js` at the root. Then:
```bash
tools/build-ts.sh           # installs the pinned compiler (npm ci), compiles, restamps ?v= on the pages
tools/build-ts.sh --check   # changes nothing; fails if a .js is not what ts/ compiles to, or a stamp is stale
tools/build-ts.sh --force   # like the plain build, but overwrites a .js that holds a hand edit
```
The build refuses to overwrite a `.js` that was edited by hand: port the edit into `ts/` and build again. Run the check before every commit that touches `ts/`, a root `.js` or a page; `git config core.hooksPath tools/hooks` makes git run it for you in that clone. The compiler is the one exact version in `package-lock.json`; nothing from npm is ever published with the site. `lucide.min.js` is third-party and stays as it is.

## Contact-form Worker (TypeScript)
`cloudflare-worker/` is the contact form's Cloudflare Worker. It is deployed by wrangler, never by GitHub Pages or the nsite (both leave the folder out). Edit `cloudflare-worker/index.ts`; wrangler compiles it when it deploys, but it only strips the types and never checks them, so check first:
```bash
tools/check-worker.sh       # type check, the offline tests, and (with wrangler installed) the types and a dry-run bundle
cd cloudflare-worker && wrangler deploy   # with the API token, never wrangler login
```
`cloudflare-worker/worker-configuration.d.ts` is generated: after changing `wrangler.toml`, or after upgrading wrangler, run `wrangler types` in `cloudflare-worker/` (offline, no credentials) and commit the result. The check fails until you do.

## Local development
Static site, runnable with any simple web server:
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000` in your browser.

## Credits
Built by [Stormberry AS](https://stormberry.as). Proudly powered by sovereign AI agents.
