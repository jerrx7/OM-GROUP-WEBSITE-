# OM Group site — work handover

Written to resume this work in a fresh chat. Read this whole file before touching anything — a lot of it is "don't repeat this mistake" knowledge that cost real back-and-forth to learn.

---

## 1. What this project is

`www.omgroupco.com` — OM Group, a Goa-based construction materials supplier (crushed stone aggregate, sand, RMC, GSB, boulders). Static HTML site, no framework/build step — each page is a single self-contained `index.html` with inline `<style>` and `<script>`. No React/Next/etc. despite what some of the prompt documents assume.

Repo root: `C:\Users\Shyam Tiwari\Downloads\OMGROUPCO\`

Git: currently on branch `staging`, main branch is `main`. Nothing in this session has been committed — everything below is uncommitted working-tree changes (`git status` will show it all as modified/untracked). **Do not commit unless the user explicitly asks.**

---

## 2. Pages that exist now (all built this session except homepage, which pre-existed)

| Route | File | Status |
|---|---|---|
| `/` | `index.html` | Pre-existing, edited (see §4) |
| `/products/6mm-aggregate` | `products/6mm-aggregate/index.html` | Pre-existing, edited (reciprocal link) |
| `/products/10mm-aggregate` | `products/10mm-aggregate/index.html` | Pre-existing (the "master" design reference), edited (reciprocal link) |
| `/products/20mm-aggregate` | `products/20mm-aggregate/index.html` | Pre-existing, edited (reciprocal link) |
| `/products/12mm-aggregate` | `products/12mm-aggregate/index.html` | **Built this session** — 12.5mm aggregate page |
| `/products/m-sand` | `products/m-sand/index.html` | **Built this session** — M-Sand page |
| `/products/washed-sand` | `products/washed-sand/index.html` | **Built this session** — Washed Sand page, **`noindex, follow`, not in sitemap** (pending mode, see below) |

**Design system authority:** the 10mm aggregate page is the approved master. Every new product page inherits its CSS/JS verbatim (same `<style>` block, same fade-up/parallax/FAQ-accordion JS) and only the content differs. Do not invent new components or a second design language — this was stated explicitly and repeatedly by the user across every page built.

**Not yet built:** Plaster Sand, Concrete Sand, River Sand detail pages. Only M-Sand, Washed Sand, and the four aggregate grades have real pages. Plaster Sand, Concrete Sand and River Sand exist **only as homepage catalog cards** (see §4) with no "View Full Details" link and no route.

---

## 3. Site-wide facts you'll need (don't re-derive these)

- **GTM container:** `GTM-KPTCD4S2` — never touch, never add a second container.
- **Phone numbers found in Organization schema:** `+919049629684` (used on every CTA/tel:/wa.me link across every page built so far) and `+918788732881` (secondary, unused so far). **Which one is WhatsApp-enabled is unconfirmed** — every WhatsApp CTA built so far uses the first number by assumption/consistency with pre-existing pages, not verification.
- **Quote form** (`index.html`, the shared modal): category `<select id="productCategory">`, subcategory `<select id="productSubcategory">`, message `<textarea id="message">`. Prefill via URL params: `?category=X&subcategory=Y&message=Z#contact` — the `message` param support **did not exist** before this session; I added it (see `prefillFromQueryParams()` around line ~2855) because M-Sand's "Request Grading Information" CTA needed to prefill the message textarea and only category/subcategory were wired up before. This is additive and safe — pages that don't pass `message` are unaffected.
- **Existing category/subcategory values already in the form** (grep `"Sand":` / `"Stone Aggregates":` in `index.html` around line 2809):
  - `"Stone Aggregates": ["6MM", "10MM", "12.5MM", "20MM", "40MM", "Boulders", "GSB (Granular Sub-Base)", "WMM (Wet Mix Macadam)"]`
  - `"Sand": ["M-Sand (Manufactured Sand)", "P-Sand (Plastering Sand)", "W-Sand (Wash Sand)", "R-Sand (River Sand)"]`
  - **This means Washed Sand and River Sand subcategory values already exist** — `W-Sand (Wash Sand)` and `R-Sand (River Sand)`. No risky shared-form change needed to wire up their quote CTAs. Use these exact strings.
- **Homepage product panel structure:** each category (`data-cat="aggregates"`, `"sand"`, `"rmc"`, etc.) is a `<template id="tpl-...">` containing `.ps-item` cards inside a `.ps-items` grid. Grid column count is a class: `.ps-items.cols-4` / `.ps-items.cols-5` (both already defined in CSS, `.cols-5` was reused from the RMC panel — don't invent a new grid class). Card image treatment is **not** a transparent cutout — it's `mix-blend-mode:multiply` on the `<img>` against a `linear-gradient(180deg,#fff 0%, var(--bone) 100%)` container background (see `.ps-item-img` CSS, ~line 1123). This means any clean, uniformly-white-background product photo "just works" as a card image with zero processing — no need to run the cutout pipeline on homepage catalog thumbnails, only on product-detail-page hero/spec images (different, bigger, premium treatment — see §5).
- **Local dev server:** there's no npm/build tooling for the site itself. To preview, run a plain Node static file server (see snippet below) on port 8811 and browse `http://localhost:8811/`. This project's shell is Git Bash on Windows; `netstat -ano | grep 8811` + `taskkill //PID <pid> //F` to stop it (plain `kill` doesn't reliably work in this environment).

  ```bash
  node -e "
  const http = require('http'); const fs = require('fs'); const path = require('path');
  const root = process.cwd();
  const types = {'.html':'text/html','.png':'image/png','.webp':'image/webp','.js':'text/javascript','.css':'text/css','.xml':'application/xml','.ico':'image/x-icon'};
  http.createServer((req,res)=>{
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(root,p), (err,data)=>{
      if (err) { res.writeHead(404); res.end('not found: '+p); return; }
      res.writeHead(200, {'Content-Type': types[path.extname(p)] || 'application/octet-stream'});
      res.end(data);
    });
  }).listen(8811, ()=>console.log('up'));
  " &
  disown
  ```

- **QA method used throughout:** Playwright (`npm install playwright && npx playwright install chromium` in a scratchpad dir, NOT in the repo) driving a headless Chromium against the local server, screenshotting sections and checking `document.documentElement.scrollWidth` for overflow and `page.on('console'/'pageerror')` for errors. The site's `.fade-up` scroll-reveal (IntersectionObserver-driven opacity) means a plain `page.screenshot({fullPage:true})` without scrolling first will render most of the page blank — always scroll through in a loop before capturing full-page shots.

---

## 4. Homepage changes made this session

- Added `<a href="/products/XXX" class="ps-item-link">View Full Details →</a>` to the 6mm, 10mm, 12.5mm, 20mm, and M-Sand cards inside their respective `.ps-item` blocks (they were missing this link before).
- **Softened the M-Sand card's claims**: it previously stated `"Grading Zone: Zone II"`, `"Silt Content: Low"`, `"IS 383 compliant"` as fixed specs — these are exactly the kind of unverified/non-permanent claims the M-Sand page itself explicitly avoids ("a grading zone is a test result, not a permanent property of a product"). Replaced with honest fields: Category, Particle Size, Standard (IS 383:2016, cited as reference not conformity claim), Grading ("Zones I–IV, on request"). **User explicitly approved this change** when asked (chose "soften the homepage claims too" over "leave it untouched").
- Added a **fifth card, River Sand**, to the Sand & Fines panel (`tpl-sand`), using a photo the user supplied (`img/products/river-sand.png`, processed with a simple crop/trim only — no cutout needed, see §3's `mix-blend-mode:multiply` note). Copy, specs, applications and tags were given verbatim by the user. **No "View Full Details" link** — user explicitly chose "card only, no link yet" over building a full detail page, specifically because (a) three of the four other sand cards also have no detail page yet, and (b) river sand extraction is a regulated activity in India and nothing in the project confirms OM Group's actual supply relationship to it — building a full content page would have required fabricating claims. **This same reasoning will apply to Washed Sand** unless the business relationship question in §6 gets answered.
- Sand panel grid changed from `.ps-items.cols-4` to `.ps-items.cols-5` to fit the fifth card (reused existing CSS, not new).

---

## 5. Image pipeline — read this before processing any new product photo

**Script:** `scripts/image-cutout.js` (already in this repo, fully commented with the diagnostic reasoning). Needs `sharp` (`npm install sharp` — was installed fine via network access in this session, should work again).

**The short version of what it does:** removes a white/plain studio background AND its soft photographic shadow in one pass (both are "smooth + neutral-colored", tested via local luminance variance + saturation), does a disk-shaped (not square!) morphological opening to drop small speckle artifacts, then a "de-bloom" pass that fades pixels near the silhouette edge that are anomalously bright compared to the material's own interior tone — this last part exists because on the M-Sand photos, the visible white "fringe" turned out to be a smooth, **fully opaque** brightness ramp baked into the source render (not separable background, not sparse noise), discovered by literally sampling raw RGBA values pixel-by-pixel across the boundary. No amount of erosion/region-size filtering fixes that kind of defect — only comparing each edge pixel's brightness against the object's own true interior color does.

**Two hard-won lessons, don't relearn them the expensive way:**
1. If you see a faint **rectangular/boxy** artifact near a thin feature (like a pour stream) after cleanup, check whether your structuring element is square — square kernels leave boxy artifacts on thin content. Use a disk (Euclidean-radius) kernel instead (already the case in `image-cutout.js`).
2. If a source photo has a thin, sparse feature (like a stream of falling grains) that gets cut off hard at the image's own canvas edge, **don't try to fix it by cropping tighter** — that just moves the hard edge, it doesn't remove it (tried this on M-Sand, made it worse). Instead, once the pixel-level cutout is as clean as it'll get, add a CSS `mask-image: linear-gradient(...)` fade on the `<img>` in the actual page (see `#heroImg, #specStoneImg` in `products/m-sand/index.html`'s `<style>` block) — fade the top ~14% of the image to transparent. This is what actually shipped for M-Sand's hero and specification images after pixel-level fixes alone weren't enough.

**Always QA against a pure black test background**, not just the site's cream (`#FAF8F3`). Fringe that's invisible against cream (because it's pale/desaturated) is often glaringly obvious against black — that's the acceptance test the user has insisted on every time.

**Image roles on a product detail page (per the M-Sand build, the current pattern):**
- **Hero image** (`.hero-media`, `#heroImg`): should be the same product visual already used on the **homepage** card for that product where one exists (for brand/product consistency), reprocessed through the cutout pipeline for the premium transparent treatment — not the raw white-background homepage asset used as-is (that would reintroduce a "white card" look, explicitly forbidden).
- **Specification-section image** (`.spec-media`, `#specStoneImg`): a close-up single-material sample photo, same cutout treatment, placed beside the specifications table.
- Neither image should have a baked-in shadow — the soft contact shadow is 100% CSS (`filter: drop-shadow(...)` on `.hero-media.fade-up.in` / `.spec-media.fade-up.in`, already in every page's shared CSS). Don't bake a shadow into the PNG.
- OG/Twitter/schema image (1200×630) should be built from the **hero** cutout composited onto the site's `--bone` (#FAF8F3) background, not from the spec-section image.

**Retired/forbidden visual elements — never reintroduce, on any page:** beige/cream disclaimer boxes, info-icon warning panels, "Not OM Group test data" style phrasing, white/rectangular product image cards or frames, navy or blue final CTA (final CTA is always the near-black `--ink` background), full-orange CTA in a secondary position. Full list lived in the original spec documents the user pasted for each page — if in doubt, match what 10mm/M-Sand already do.

---

## 6. Open business questions (do not fabricate answers to these — ask or leave conservative)

1. **Washed Sand ↔ M-Sand relationship is unconfirmed.** Does OM Group sell "Washed Sand" as a distinct line item, or is it a note/variant under M-Sand? This blocks the Washed Sand page's central claim (see §7 — the pasted spec documents build in a "safe default / pending mode" pattern for exactly this reason).
2. **River Sand supply relationship is unconfirmed** — same caution applies; this is why the River Sand card has no detail-page link yet.
3. **Which of the two phone numbers is WhatsApp-enabled** is unconfirmed — every `wa.me` link built so far assumes `+919049629684` by consistency with pre-existing pages, not verification.
4. **Banda Wafoli's state** (Goa vs Maharashtra) is never stated on any page, deliberately — this was a pre-existing sitewide ambiguity flagged in the original 12.5mm/M-Sand spec documents, not something resolved this session.
5. General pattern observed across every build package the user has pasted this session: prefer "OM Group supplies X" (safe, verifiable) over "OM Group manufactures/produces X" (a stronger claim) unless the manufacturing relationship is explicitly confirmed. Apply this default to Washed Sand too unless told otherwise.

---

## 7. Washed Sand page — DONE (built after this handover was first written)

The user re-pasted the same two documents plus the sample photo in this same conversation shortly after this handover was created, so the build happened here rather than in a new chat. `products/washed-sand/index.html` exists, is fully populated (18 sections, 21 FAQs), `robots: noindex, follow`, not in sitemap.xml, no Product schema (BreadcrumbList only) — all per the "safe default / pending mode" positioning in both source documents, since the Washed Sand ↔ M-Sand relationship is still unconfirmed. An HTML comment block at the top of the file lists the exact six things to change when that business answer comes in (this replaced the "WASHED_SAND_MODE config" concept from the master-prompt document, which assumed a component framework the site doesn't have).

**One real finding from this build, worth knowing if Plaster Sand or Concrete Sand come next:** the homepage's `assets/washed-sand.png` (the "approved homepage Washed Sand visual" the brief said to reuse) turned out to be byte-identical to `img/products/m-sand.png` — a placeholder photo reused across three different sand cards (M-Sand, Washed Sand, Concrete Sand all point at the same file). Using it as the Washed Sand hero would have made the page look pixel-identical to M-Sand's, undermining the entire "don't imply these are the same product" positioning the page exists to maintain. Flagged to the user, who supplied a distinct washed-sand photo instead (used for both hero and specification images). **Check whether Plaster Sand's and Concrete Sand's homepage images are also duplicates before reusing them as-is** — `md5sum` the candidate files against the other product images first.

Original planning notes are preserved below for reference / in case a similar page needs building fresh in a new chat:

1. **`om-group-washed-sand-FULL-BUILD.md`** — an 18-section content package written in a deliberately "safe default" register because the M-Sand relationship (§6.1 above) is unconfirmed. Key points:
   - Full page copy provided for all 18 sections (breadcrumb → final CTA), written so that nothing asserts a manufacture claim, a specific source (natural vs manufactured), or a definitive M-Sand relationship.
   - Recommends `robots: noindex, follow` and **excluding the page from sitemap.xml** until the relationship is confirmed — deliberately indexable-later, not indexable-now.
   - No Product schema — BreadcrumbList + reused Organization only, specifically because a longer/more complete page would make an unconfirmed Product claim more convincing to a crawler/AI system, not less risky.
   - Full FAQ list (21 questions) with three questions from a hypothetical longer list removed/rewritten because they presumed the relationship.
   - Title: "Washed Sand Supplier in Goa | OM Group" (not "Washed M-Sand...") — deliberately the term that doesn't assert a relationship.

2. **The "Claude Code — Final Implementation Master Prompt"** — a much longer, more directive technical prompt covering the same content but framed around a `WASHED_SAND_MODE` config pattern (`"pending"` / `"path-a"` / `"path-b"` etc.) for activating the fuller claims later. **Note:** this prompt assumes a React/Next.js-style component architecture ("centralized configuration source," "components") — **the actual site has no such architecture** (plain static HTML per page, see §1). When implementing, adapt the *intent* (one clearly-marked place to change when the business answer comes in, e.g. a JS const or a clearly commented HTML block) rather than trying to build a literal config-driven component system that doesn't fit the rest of the site.

**Image:** the user pasted a photo of grey washed sand in this conversation but **it was not saved to disk** before the conversation ended — same situation that happened twice before with M-Sand's and River Sand's photos (chat-pasted images are not accessible as files; only files saved into the repo can be processed). **First thing to do in the new chat: ask the user to save that image into the repo** (e.g. `products/washed-sand-sample.png`), the same way they eventually did for `products/msand.png` and `products/R SAND  (RIVER SAND).png`.

**Recommended approach for the new chat, based on how every prior page in this session actually went:**
1. Re-read this handover fully, then re-read whichever of the two washed-sand documents the user re-shares.
2. Ask the user directly whether the Washed Sand ↔ M-Sand relationship is confirmed or still pending — don't assume either way. If still pending, build the safe-default/"pending mode" version from the FULL-BUILD doc (it's completely usable and complete as written — it's not a stub).
3. Get the washed sand sample image saved to disk (see above), then run it through `scripts/image-cutout.js`, QA against black background at zoom, apply a CSS mask fade if it has the same thin-feature-at-canvas-edge issue the M-Sand photos had.
4. Build `products/washed-sand/index.html` inheriting the 10mm/M-Sand master CSS+JS verbatim.
5. Decide indexing (`noindex, follow` + no sitemap entry, per both documents, unless the relationship gets confirmed in this session) — flag this decision to the user rather than silently picking one.
6. Wire the quote CTA to `?category=Sand&subcategory=W-Sand%20(Wash%20Sand)#contact` (value confirmed to already exist in the form, §3).
7. Add reciprocal-style internal links (Washed Sand → M-Sand prominently, per both docs' emphasis on M-Sand as the "technical authority" page) — but do **not** add a homepage "View Full Details" link update or a sitemap entry until indexing is actually turned on, to stay consistent with the noindex decision.
8. Screenshot QA (desktop/mobile/dark-bg image test) before reporting done, exactly like every prior page — the user has caught incomplete/unverified claims of "done" multiple times this session and clearly checks the actual rendered result themselves (they use a local Chrome pointed at the same `localhost:8811` server).

---

## 8. Working-style notes (things the user corrected or explicitly confirmed this session)

- **The user checks visually, in a real browser, every time.** They pointed out a residual defect (hard rectangular edge on the M-Sand hero) *after* it had been reported as fixed and screenshotted — the screenshot method used at the time didn't happen to land on the exact problem spot. Zoom into the specific region a claim is about, not just a wide establishing shot, before saying something is resolved.
- **Marked-up screenshots are the most reliable problem reports** — when the user circled the defect in blue, the actual root cause became obvious in a way verbal description hadn't. If a fix doesn't land, ask for a fresh screenshot rather than iterating blind.
- **Always give the localhost link after any change**, and expect to be asked for it again after the server gets stopped between turns (the Bash tool's background server does not persist reliably across the harness's conversation-compaction/tool boundaries — just restart it on request, it's a 2-second op).
- **Business/content honesty is a hard constraint, repeatedly emphasized**, not just a style preference: no manufacturing claims without confirmation, no invented technical specs (Zone II, silt %, density) without a data source, no CTA immediately after a "which product do I actually need" clarification section (the user's own docs call this out specifically as intentional — don't "fix" it by adding a CTA there).
- **Ask before building a full content page when the underlying business fact is unconfirmed** (River Sand detail page) — the user has consistently preferred "card/page-shell only, ask first" over "build the full thing and hope it's right" whenever a page would need to assert something unverified.
- When a chat-pasted image is referenced ("I have attached..."), it is **not** accessible as a file — always check the repo for a newly-saved file first, and if none exists, explain plainly that the image needs to be saved to disk, don't just say "no image found."
