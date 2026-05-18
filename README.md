# Stormberry Website

This repository contains the source code for the Stormberry AS corporate website.

## Architecture
- **Vanilla HTML/CSS/JS**: The site is built with static files for maximum speed, security, and simplicity.
- **Privacy First**: No cookies, no trackers, no external dependencies that compromise user privacy.
- **Sovereign AI**: Built and maintained using high-speed agentic workflows.

## Standard Operating Procedures (SOPs)

### Blog Archiving
To maintain performance and a clean feed, we follow a strict monthly archiving rule for the blog:
1. `blog.html` MUST only contain posts for the **current month**.
2. Past months are archived in files named `blogYYYYMM.html`. For example, all April 2026 posts are in `blog202604.html`.
3. When a new month starts, you must create the archive file for the previous month, move all those posts into it, and leave only the new month's posts in `blog.html`.
4. All blog imagery MUST be stored in the `/pictures` directory to keep the root directory clean.

### Image Management
- Use `1.91:1` aspect ratio (1200x628) for LinkedIn compatibility.
- Ensure images match the dark, cinematic, glassmorphism visual identity of Stormberry.

## Local Development
Since this is a static site, you can run it locally with any simple web server:
```bash
python3 -m http.server 8000
```
