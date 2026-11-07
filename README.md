# Masonry feed

React 18 + TypeScript + Vite. An infinite, virtualized masonry feed wired to the [Mini Pinterest API](../pinboard-api) (`GET /feed`, cursor pagination).

## Run it

```bash
# terminal 1: the API (see ../pinboard-api)
docker compose up --build && python -m scripts.seed 2000
# terminal 2
npm install
npm run dev            # http://localhost:5173, /api/* is proxied to localhost:8000
npm test               # layout + pagination-merge unit tests (9 tests)
```

For a deployed demo, set `VITE_API_URL` to your API's public URL and add the site's origin to the API's `CORS_ORIGINS`.

## What makes it fast

| Technique | Where | What it buys |
|---|---|---|
| Virtualization | `Masonry.tsx`, `layout.ts` | Only items intersecting the viewport ±600px are in the DOM (the header shows `N of M pins in the DOM`) |
| Layout from API dimensions | `computeLayout` | Item boxes are known before any image loads: no layout shift |
| Snapped scroll window | `useViewWindow` | React re-renders once per 200px scrolled, not on every scroll event |
| `IntersectionObserver` sentinel | `Masonry.tsx` | Infinite scroll without scroll handlers; prefetches 1200px ahead |
| Lazy images | `PinCard.tsx` | `loading="lazy"` + `decoding="async"` for overscan items; first 6 are `eager` + `fetchpriority=high` for LCP |
| In-flight guard + dedupe | `useInfiniteFeed.ts`, `mergeUnique` | No duplicate page fetches (StrictMode, fast scrolling) or duplicate cards |
| `memo` + `contain: layout paint` | `PinCard`, CSS | Cards don't re-render or force layout on their neighbors |

Trade-off: layout is recomputed from scratch when items are appended (O(n × columns)); fine into the low thousands. At tens of thousands, cache per-column heights and place only the new items.

## Lighthouse: before and after

`/?mode=naive` renders every loaded item with no lazy loading (the "before"). `/` is the optimized build.

**Method:** production build (`npm run build && npm run preview`), Lighthouse 13.6.0 from the command line (headless Chrome, mobile emulation, simulated Slow 4G), Performance category only, 3 runs per URL, API seeded with 2,000 pins, same laptop (13th Gen Intel Core i5-13420H, 16 GB RAM) with nothing else in use. Table shows the median run.

| URL | Performance | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| `/?mode=naive` | 75 | 0.8 s | 9.4 s | 0 ms | 0 | 1.0 s |
| `/` (optimized) | 81 | 0.8 s | 5.2 s | 0 ms | 0 | 1.1 s |

Individual runs (score / LCP / TBT / Speed Index):

| Run | Naive | Optimized |
|---|---|---|
| 1 | 75 / 9.4 s / 0 ms / 1.0 s | 82 / 5.1 s / 0 ms / 1.1 s |
| 2 | 75 / 9.8 s / 0 ms / 1.0 s | 77 / 5.7 s / 160 ms / 1.8 s |
| 3 | 75 / 9.3 s / 0 ms / 1.0 s | 81 / 5.2 s / 0 ms / 0.8 s |

**Reading the results honestly:**
- The measurable improvement is LCP, about 45% lower (9.4 s to 5.2 s), which raises the score by about 6 points. My untested explanation: the first 6 images load at high priority while the rest are lazy, so they don't compete for bandwidth with the largest image.
- FCP, TBT, Speed Index and CLS are effectively the same in both modes. CLS is 0 in naive mode too, because both modes size every card from the API's image dimensions. So I am not claiming a CLS improvement.
- Optimized LCP is still 5.2 s under simulated Slow 4G, so this is better, not fast.
- Lighthouse only measures the initial load and does not scroll. Virtualization matters most with long lists, which a first-load run understates.
- DOM size: after scrolling until 690 pins had loaded, the optimized page's header showed `29 of 690 pins in the DOM`. Naive mode renders every loaded item by design, and I did not measure its DOM count separately.
- Earlier runs of the naive page in Chrome DevTools (Lighthouse 13.5.0) also scored 75, with LCP 10.8 to 12.0 s, which agrees with the command-line numbers.
- Raw JSON reports are in `lighthouse-results/`.

## AI write-up

- **What AI helped with:** Claude scaffolded the project (component structure, greedy column placement, infinite-scroll hook, unit tests). I ran the tests and the app, and measured the performance myself.
- **What it got wrong / what the measurements changed:** the plan assumed the optimized version would improve layout shift. Measuring showed CLS is already 0 in naive mode, because both modes size cards from API dimensions, so the CLS claim does not hold as a before/after difference. The only significant Lighthouse gain turned out to be LCP.
- **Data issue I noticed:** the seed data pairs random titles with random placeholder photos, so captions do not match the images (for example "Mountain #1990" shows a building). This does not affect the feed code, but a demo should use real data.
- **How tests and measurements caught things:** the 9 unit tests cover placement, non-overlap, bounded rendering of a huge list, and deduplication (`never overlaps items within a column`, `renders a small, bounded slice of a huge list`, `drops duplicates by id`). Running the real Lighthouse comparison exposed the CLS claim above.

## Known limits / next steps

- LCP is still 5.2 s on simulated Slow 4G. Serving resized thumbnails instead of full-size images is the next thing to try, but I have not tested it.
- Lighthouse scores varied between runs (optimized 77 to 82), so small differences are noise.
- `npm audit` reports 6 vulnerabilities (3 moderate, 1 high, 2 critical) in the dependency tree. I have not reviewed them and did not run `npm audit fix --force`.
- Not deployed yet. Add a live demo link (Vercel or Netlify for the front end, plus a hosted API) once it is.