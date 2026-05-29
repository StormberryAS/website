# Stormberry Website

Source code for the Stormberry AS corporate website.

**Live:** [stormberry.as](https://stormberry.as)

## Architecture
- **Vanilla HTML/CSS/JS**, no frameworks, no build step.
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

## Local development
Static site, runnable with any simple web server:
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000` in your browser.

## Credits
Built by [Stormberry AS](https://stormberry.as). Proudly powered by sovereign AI agents.
