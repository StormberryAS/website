# Website-v2 (preview, do not deploy)

Parallel rewrite of `Website/` to test the **operational AI partner** repositioning. Sibling folder, completely isolated from the live site. Nothing here is published until you copy it back to `Website/`.

Built 2026-05-26 alongside the pitch consolidation in `KnowledgeBase/ThomassenPovoaHoldingAS/StormberryAS/Elevator pitch.md`. The original `Website/` repo's `README.md` is preserved next to this file.

## What changed vs Website/

- **Positioning**: Stormberry is now an **operational AI partner**. The four parallel pillars (Sales / Strategy / Culture / AI) are reframed as one AI-led product, the Loop.
- **Core proposition**: Stormberry helps you structure your sales and strategy in a global context, then runs the AI loop year-round to keep that structure sharp.
- **The Loop (three motions, one yearly cycle):**
  1. **AI in daily operations** (reporting, docs, maintenance, customer comms, Article 4 training)
  2. **AI on the sales pipeline** (scoring against the strategy)
  3. **Lessons back into strategy** (year-end synthesis updates the strategy)
- **Cross-cultural communication** folded into delivery as a structural characteristic of every motion. Not a separate service line. `culture.html` survives but reframed as "Global Delivery".

## Files rewritten

| File | Status |
|---|---|
| `index.html` | New hero (loop one-liner + structure/global subhead), new "The Loop" section with three motion cards, footer tagline updated |
| `ai.html` | Now the canonical loop page. Three motion sections, global-delivery section, sovereign + Marcos background section |
| `services.html` | Four-pillar grid replaced with three motions + global delivery card |
| `sales.html` | Reframed as "Motion 2: AI on your sales pipeline". Four sub-deliverables: deal scoring, qualification, forecasting, coaching |
| `strategy.html` | Reframed as "Motion 3: AI in your strategy". Four sub-deliverables: end-of-year synthesis, one-page decision filter, feed-forward, exec mentoring |
| `culture.html` | Reframed as "Global Delivery" delivery characteristic, not a service. Four sub-points: four languages, communication style, local-language Article 4, built-in not bolted-on |

## Files with nav + footer updated, body unchanged

`about.html`, `availability.html`, `blog.html`, `blog202604.html`, `contact.html`, `labs.html`, `partnerships.html`, `privacy.html`, `qr.html`. Body content of these can be rewritten in a follow-up pass if it doesn't sit right against the new framing.

## Files untouched

`404.html` (intentional, no nav block to update there).

## How to preview locally

```bash
cd ~/ThomassenPovoaHoldingAS/StormberryAS/GitHub/Website-v2
python3 -m http.server 8080
# Then open http://localhost:8080/ in a browser
```

Or open `index.html` directly (`xdg-open index.html`). Most pages work file:// too, though some lucide icons might lag without a server.

## When you approve

Replace `Website/` with this folder (after committing the current state of `Website/` to git as a rollback point):

```bash
cd ~/ThomassenPovoaHoldingAS/StormberryAS/GitHub/
git -C Website status   # confirm clean / committed
mv Website Website-old-2026-05-26
mv Website-v2 Website
# Then cd Website && git add . && git commit -m "..."
```

If you want to keep a smaller diff, copy only the files you want to take over:

```bash
cp Website-v2/index.html Website/
cp Website-v2/ai.html Website/
# etc, file-by-file
```

## Open decisions for you

- **Nav label "How We Work" vs "Services"**: I went with "How We Work" because it reads as a unified product, not a menu. Easy to find-replace if "Services" suits better.
- **`sales.html` / `strategy.html` / `culture.html` URLs preserved**: kept the same slugs so any inbound links don't break. The page content is reframed.
- **`partnerships.html` (OnSide AI page)**: untouched body. The OnSide partnership story sits as its own thing; might benefit from a brief "this is parallel to the Stormberry loop" framing line at the top, but no urgency.
- **`labs.html`, `blog.html`**: untouched body. The blog archive integrity rule applies; don't retro-edit. Labs can be reframed if you want to make the loop-product link more visible.
- **`about.html`**: deserves a short paragraph about the operational-AI-partner positioning and Marcos's background; happy to draft when you've absorbed the rest.
- **Meta descriptions and OG tags**: updated on the rewritten pages; the lightly-touched pages still carry the old positioning in their meta. Easy follow-up pass.

## What was not changed

- CSS (`style.css`), JS (`script.js`), fonts, images, lucide icons, partners folder, sitemap, cloudflare-worker, robots.txt — all carried over verbatim from `Website/` so the v2 renders identically in style and behaviour.
