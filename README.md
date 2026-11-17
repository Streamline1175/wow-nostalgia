# Nostalgia Portal

An unofficial fan tribute to the stone-and-parchment game community portals of 2004–2010 — the kind that
changed their whole colour scheme with every expansion.

- **Era skins** — one layout, three wardrobes: Classic (warm brown), Burning Crusade (fel green and violet),
  Wrath of the Lich King (frost blue). The switch is in the top bar; `?era=classic|outland|northrend` links to one.
- **Museum notes** — original write-ups about what the site was like in each era, plus an era timeline.
- **Time Machine** — links to the real, preserved pages in the Internet Archive's Wayback Machine.
- **Memory Wall** — visitors pin their own memories (stored in their browser's `localStorage`; there is no server).

## What this is not

It is not a copy of the original site. No logos, artwork, screenshots or article text from the original pages are
included or hosted here — the scenery, crest, icons and writing were all made for this project. The real pages are
linked at the Internet Archive rather than reproduced.

Not affiliated with, endorsed by, or sponsored by Blizzard Entertainment. World of Warcraft and related names are
trademarks of their owner, used only to describe the period being remembered.

## Running it

Plain static files, no build step:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

It can be hosted as-is on any static host (GitHub Pages, Netlify, …).

## Layout

| Path | What |
| --- | --- |
| `index.html` | Page shell and the three background scenes (inline SVG) |
| `assets/css/site.css` | Layout plus the per-era colour tokens (`html[data-era=…]`) |
| `assets/js/content.js` | All text: posts, headlines, timeline, capture links |
| `assets/js/site.js` | Era switching, routing, sidebar widgets, memory wall, particles |

To add an era: add its tokens in `site.css`, a scene in `index.html`, and its entries in `content.js`.
