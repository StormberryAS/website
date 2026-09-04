import os

pages = [
    ('', True),
    ('services', True),
    ('ai', True),
    ('sales', True),
    ('strategy', True),
    ('culture', True),
    ('partnerships', True),
    ('about', True),
    ('contact', True),
    ('privacy', True),
]

english_only = [
    'labs',
    'ai-act-artikkel-4-opplaering',
    'blog',
    'blog202604',
    'blog202605',
    'blog202606',
    'blog202607',
    'blog202608'
]

# English slug -> Norwegian slug. The Norwegian pages are flat files at the repo
# root (no-salg.html), not a /no/ directory: that directory was retired on
# 2026-09-04 because no.html and no/index.html were competing for /no.
NO_SLUG = {
    "": "no",
    "services": "no-tjenester",
    "ai": "no-ki",
    "sales": "no-salg",
    "strategy": "no-strategi",
    "culture": "no-kultur",
    "partnerships": "no-partnerskap",
    "about": "no-om-oss",
    "contact": "no-kontakt",
    "privacy": "no-personvern",
}

sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
sitemap += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'

# ISO date stamp representing the most recent site update (used for search engine crawler freshness indexing)
lastmod = "2026-09-03"

for page, has_no in pages:
    en_loc = f"https://stormberry.as/{page}" if page else "https://stormberry.as/"
    no_loc = f"https://stormberry.as/{NO_SLUG[page]}" if page else "https://stormberry.as/no"
    
    # English entry
    sitemap += '  <url>\n'
    sitemap += f'    <loc>{en_loc}</loc>\n'
    sitemap += f'    <lastmod>{lastmod}</lastmod>\n'
    if has_no:
        sitemap += f'    <xhtml:link rel="alternate" hreflang="en" href="{en_loc}" />\n'
        sitemap += f'    <xhtml:link rel="alternate" hreflang="no" href="{no_loc}" />\n'
        sitemap += f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_loc}" />\n'
    sitemap += '  </url>\n'
    
    # Norwegian entry
    if has_no:
        sitemap += '  <url>\n'
        sitemap += f'    <loc>{no_loc}</loc>\n'
        sitemap += f'    <lastmod>{lastmod}</lastmod>\n'
        sitemap += f'    <xhtml:link rel="alternate" hreflang="en" href="{en_loc}" />\n'
        sitemap += f'    <xhtml:link rel="alternate" hreflang="no" href="{no_loc}" />\n'
        sitemap += f'    <xhtml:link rel="alternate" hreflang="x-default" href="{en_loc}" />\n'
        sitemap += '  </url>\n'

for page in english_only:
    en_loc = f"https://stormberry.as/{page}"
    sitemap += '  <url>\n'
    sitemap += f'    <loc>{en_loc}</loc>\n'
    sitemap += f'    <lastmod>{lastmod}</lastmod>\n'
    sitemap += '  </url>\n'

sitemap += '</urlset>\n'

with open('sitemap.xml', 'w') as f:
    f.write(sitemap)

if os.path.exists('dist'):
    with open('dist/sitemap.xml', 'w') as f:
        f.write(sitemap)
