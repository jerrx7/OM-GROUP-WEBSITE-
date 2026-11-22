/* OM GROUP - Hot Mix Asphalt application page generator: shared helpers (markup that matches the other application pages). */
const photos = require('./photos.json');
const B = '/img/applications/hot-mix-asphalt/';

/* Commercial gate (brief, section 3). OM GROUP's catalogue does not list Hot Mix Asphalt, so the page is built in STATE B:
   educational wording only, no supplier/manufacturer claim, no Product schema, noindex, a "discuss your requirement" CTA.
   Flip `verified` to true ONLY after the owner confirms plant, mixes, capacity, JMF, laboratory and delivery coverage, then fill the VERIFIED block. */
const HMA = { verified: false };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const enc = s => encodeURIComponent(s).replace(/'/g, '%27');

/* picture: avif + webp, widths from the export manifest */
function pic(slug, alt, o = {}) {
  const m = photos[slug]; if (!m) throw new Error('unknown picture ' + slug);
  const sz = m.sizes, big = sz[sz.length - 1];
  const set = ext => sz.map(w => `${B}${slug}-${w}.${ext} ${w}w`).join(', ');
  const sizes = o.sizes || '(max-width:899px) 92vw, 560px';
  const h = Math.round(big * m.h / m.w);
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}" /><img src="${B}${slug}-${sz[Math.min(1, sz.length - 1)]}.webp" srcset="${set('webp')}" sizes="${sizes}" width="${big}" height="${h}" alt="${esc(alt)}"${o.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${o.style ? ` style="${o.style}"` : ''} /></picture>`;
}
/* framed photo with the caption pill (the .ap-photo pattern of the other pages); portrait pictures get a taller frame */
function fig(slug, cap, alt, o = {}) {
  const m = photos[slug], tall = m.h > m.w * 1.05;
  const cls = 'ap-photo hma-ph' + (tall ? ' hma-tall' : '') + (o.cls ? ' ' + o.cls : '');
  return `<figure class="${cls}"${o.rv === false ? '' : ' data-rv="photo"'}${o.pos ? ` style="--pos:${o.pos}"` : ''}><div class="ap-photo-in">${pic(slug, alt, o)}</div>${cap ? `<figcaption class="ap-photo-cap"><span>${cap}</span></figcaption>` : ''}</figure>`;
}
/* section */
const sec = (id, title, inner, o = {}) => `\n<section class="ap-sec${o.bone ? ' ap-sec--bone' : ''}" id="${id}" aria-labelledby="${id}Title"><div class="wrap">${inner}</div></section>\n`;
const head = (id, kicker, h2, lede, extra = '') => `<div class="ap-prose" data-rv><p class="ap-kicker">${kicker}</p><h2 class="ap-h2" id="${id}Title">${h2}</h2>${lede ? `<p class="ap-lede">${lede}</p>` : ''}${extra}</div>`;
const p = (...a) => a.map(t => `<p>${t}</p>`).join('');
const ul = a => `<ul class="ap-list">${a.map(t => `<li>${t}</li>`).join('')}</ul>`;
const card = (h, body) => `<div class="wmd-item wmd-card" data-rv><h3 class="ap-h4">${h}</h3>${body}</div>`;
const grid = a => `<div class="wmd-grid"${a.length === 4 ? ' data-maxcols="4" data-minw="250"' : ''}>${a.join('')}</div>`;
const warn = t => `<p class="psd-warn" role="note">${t}</p>`;
const small = t => `<p class="ap-small">${t}</p>`;
const ans = (q, a) => `<div class="ap60-answer" data-rv><p class="ap60-q">${q}</p><p>${a}</p></div>`;
/* table: first column is the row header; every other cell carries data-label for the stacked phone layout */
function tbl(caption, heads, rows) {
  return `<div class="ap-tbl-wrap ap-cmp-wrap" tabindex="0" role="region" aria-label="${esc(caption)}" data-rv><table class="ap-tbl ap-cmp"><caption>${caption}</caption><thead><tr>${heads.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((c, i) => `<td data-label="${esc(heads[i + 1])}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* CTAs. State B: "discuss", never "request a Hot Mix quotation"; the standard quotation form opens with the message filled in (category is needed by the form to open; Hot Mix is not a listed product) */
const FORM = '/?category=Stone%20Aggregates&message=';
const cta = (msg, evt, loc, label, cls = 'btn-accent', arrow = true) => `<a href="${FORM}${enc(msg)}#contact" class="btn ${cls}" data-ev="${evt}" data-loc="${loc}">${label}${arrow ? ' <span class="btn-arrow" aria-hidden="true">→</span>' : ''}</a>`;
const MSG = {
  req: "Hot Mix Asphalt enquiry: I would like to discuss a Hot Mix requirement for a road project. Please confirm availability and supply arrangements.",
  spec: "Hot Mix Asphalt enquiry: I would like to share a mix specification (mix type, governing specification, quantity, delivery location) and check whether it can be supplied.",
  tech: "Hot Mix Asphalt enquiry: I would like technical information (Job Mix Formula, grading, binder and test documents) and to know what can be provided."
};
const ctaRow = (loc, ...which) => `<div class="ap-cta-row" style="margin-top:22px">${which.map((w, i) => w === 'req' ? cta(MSG.req, 'hot_mix_quote_click', loc, 'Discuss Your Hot Mix Requirement', i ? 'btn-ghost' : 'btn-accent') : w === 'spec' ? cta(MSG.spec, 'hot_mix_quote_click', loc + '_spec', 'Submit Your Mix Specification', 'btn-ghost') : cta(MSG.tech, 'hot_mix_technical_request', loc, 'Request Technical Information', 'btn-ghost', false)).join('')}</div>`;

/* explorer: tab buttons + one state block per tab (figure + text). Without script every block is visible; plainBind (page script) shows one at a time. */
const ex = (cls, key, tabs, states, o = {}) => `<div class="s3d-box ex-box hma-ex ${cls}" data-ex${o.ev ? ` data-evbox="${o.ev}"` : ''} data-init='${JSON.stringify({ [key]: tabs[0][0] })}'>
<p class="s3d-lbl hma-lbl">${o.label || 'Choose'}</p>
<div class="hma-tabs s3d-seg${o.scroll ? ' hma-scroll' : ''}" role="group" aria-label="${esc(o.label || 'Choose')}">${tabs.map(([k, t], i) => `<button type="button" data-set="${key}:${k}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div>
<div class="hma-states">${tabs.map(([k], i) => `<div class="hma-st" data-when="${key}:${k}"><div class="hma-st-fig">${states[i][0]}</div><div class="hma-st-tx">${states[i][1]}</div>${states[i][2] ? `<div class="hma-st-wide">${states[i][2]}</div>` : ''}</div>`).join('')}</div>
</div>`;

module.exports = { ex, photos, B, HMA, esc, enc, pic, fig, sec, head, p, ul, card, grid, warn, small, ans, tbl, FORM, cta, MSG, ctaRow };
