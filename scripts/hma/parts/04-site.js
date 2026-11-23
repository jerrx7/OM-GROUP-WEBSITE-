const L = require('../lib');
const { pic, fig, sec, head, p, ul, card, grid, warn, small, ans, tbl, ex, ctaRow } = L;

/* seeded random for the drawings (so the page builds the same way every time) */
const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

/* ============ quality control ============ */
function quality() {
  const Q = [
    ['agg', 'Aggregate', 'asphalt-aggregate-stockpiles', 'Aggregate stockpiles in a quarry yard beside a wheel loader', 'Raw materials · aggregate', ['Sieve analysis and gradation.', 'Aggregate crushing or strength-related properties, Los Angeles abrasion and aggregate impact value.', 'Flakiness and elongation.', 'Water absorption and specific gravity.', 'Soundness or durability, and cleanliness.', 'Stripping-related properties and other specified tests.'], 'The exact programme depends on the mix and contract.'],
    ['bin', 'Binder', 'asphalt-bitumen-binder-laboratory-test', 'Penetration and softening point test apparatus testing bitumen in a laboratory', 'Raw materials · binder', ['Absolute viscosity and kinematic viscosity.', 'Penetration and softening point.', 'Flash point and solubility.', 'Tests on aged binder residue.', 'Other specified binder properties.'], 'Depending on the binder type and specification. Mineral filler is checked for fineness, grading, material properties and compatibility with the mix.'],
    ['mix', 'Mix design', 'bitumen-additive-filler-samples', 'Laboratory jars with bitumen, polymer pellets and mineral powders on a bench', 'Mix design · laboratory', ['Aggregate gradation and binder content.', 'Bulk specific gravity and maximum theoretical specific gravity.', 'Air voids, VMA and VFB.', 'Marshall stability and flow.', 'Moisture susceptibility, where required.', 'Wheel-tracking or rutting-related testing, where required.'], 'Acceptance limits come from the applicable specification and approved design.'],
    ['prod', 'Production', 'asphalt-plant-control-room', 'A plant operator at a control desk', 'Production · plant records', ['Proportioning of every material stream.', 'Binder content and aggregate grading of the produced mix.', 'Temperature at each stage.', 'Uniformity of the mixture.', 'Production records against the approved JMF.'], 'Production records show what the plant did; they do not replace the specified tests.'],
    ['del', 'Delivery', 'hot-mix-asphalt-temperature-check', 'A technician checking the temperature of hot asphalt in a truck body', 'Delivery · plant and site', ['Delivery documentation and mix identification.', 'Delivery and laying temperature.', 'Visual condition of the mix.', 'Quantity and timing.'], 'Checked at the plant before dispatch and again on arrival at the site.'],
    ['field', 'Field construction', 'hot-mix-site-inspection', 'Site engineers reviewing a tablet beside a paver', 'Field · laying and rolling', ['Compaction temperature during rolling.', 'Layer thickness and surface regularity.', 'Joint quality.', 'Finished levels and crossfall.', 'Binder and grading verification on samples.'], 'Checked while the work is being done, against the project quality plan.'],
    ['fin', 'Finished pavement', 'asphalt-pavement-core-sampling', 'A technician drilling a core from a finished asphalt road', 'Finished pavement · acceptance', ['Field density.', 'Core samples.', 'Thickness, level and crossfall.', 'Surface regularity and joints.', 'Relevant test results.'], 'The acceptance process is governed by the contract.']
  ];
  const states = Q.map(q => [fig(q[2], q[4], q[3], { rv: false, sizes: '(max-width:899px) 92vw, 520px' }), `<span class="tag">${q[4]}</span><h4>${q[1]}</h4><p class="ap-label">Tests and checks may include</p>${ul(q[5])}<p class="ap-small">${q[6]}</p>`]);
  return sec('quality', '', `
    ${head('quality', 'Interactive 10 · Quality control explorer', 'Quality must be checked at every stage.', 'Hot Mix Asphalt is an engineered material. Its quality depends on the consistency of the raw materials, the mix design, production, transport and construction. Quality control is not a visual inspection of black asphalt.')}
    ${ex('hma-qc', 'qc', Q.map(q => [q[0], q[1]]), states, { label: 'Choose a stage of checking', ev: 'hot_mix_process_interaction', scroll: true })}
    ${warn('<strong>A good-looking asphalt surface does not prove that the mix meets its acceptance criteria.</strong> Testing must follow the applicable project quality plan. The contract determines the tests, frequency and acceptance limits.')}
    <h3 class="ap-h3" style="margin-top:44px">What the quality records cover</h3>
    ${tbl('Quality record categories', ['Quality category', 'Example information'], [['Aggregate', 'Gradation and material test results'], ['Binder', 'Grade and certificate information'], ['Mix design', 'JMF and optimum binder content'], ['Production', 'Plant settings and production records'], ['Temperature', 'Production, delivery and laying observations'], ['Compaction', 'Field density and core results'], ['Finished pavement', 'Thickness, level and surface inspection']])}
    ${small('Numerical values are shown only when they are actual test records from an approved mix design or test report.')}
    ${ctaRow('quality', 'tech')}`, { bone: true });
}

/* ============ temperature ============ */
const TSTAGES = [
  ['Binder storage and heating', 'Binder viscosity changes with temperature: too cold is hard to pump, overheated can age or degrade.'],
  ['Aggregate drying and heating', 'Moisture must be driven off and the aggregate heated for proper coating.'],
  ['Mixing', 'The binder must coat the particles evenly at a suitable temperature.'],
  ['Finished-mix discharge', 'The mix leaves the plant at its production condition.'],
  ['Truck loading', 'Loading starts the cooling clock on the way to the site.'],
  ['Transport', 'Distance, weather, truck body and covering all change how much heat is lost.'],
  ['Site receipt', 'The mix is checked on arrival against the project requirement.'],
  ['Paver placement', 'The mix must spread and form the mat while still workable.'],
  ['Initial compaction', 'Rolling begins within the specified compaction temperature window.'],
  ['Intermediate and final rolling', 'Rolling continues while the mix can still be compacted, then finishes.']];
function temperature() {
  const rows = TSTAGES.map((s, i) => `<tr><th scope="row"><b class="hma-n">${i + 1}</b>${s[0]}<small>${s[1]}</small></th><td data-label="Lowest °C"><input inputmode="decimal" data-t="lo" data-i="${i}" aria-label="Lowest approved temperature, ${s[0]}, degrees Celsius" placeholder="–" autocomplete="off" /></td><td data-label="Highest °C"><input inputmode="decimal" data-t="hi" data-i="${i}" aria-label="Highest approved temperature, ${s[0]}, degrees Celsius" placeholder="–" autocomplete="off" /></td></tr>`).join('');
  return sec('temperature', '', `
    ${head('temperature', 'Interactive 06 · Temperature journey', 'Temperature decides whether the mix can still be worked.', 'Temperature affects the viscosity and workability of the bituminous mixture. The mix must remain within the specified production, transport and construction conditions. If it becomes too cool before placement and compaction it is difficult to spread and compact properly.')}
    ${warn('<strong>There is no single temperature that is correct for all Hot Mix.</strong> The range depends on the binder grade, the mix design, the plant arrangement, weather, transport distance, the construction specification and the approved rolling procedure. No temperature is built into this page.')}
    <div class="hma-pair hma-pair--rev" style="margin-top:20px">
      <div class="ap-prose" data-rv><h3 class="ap-h3">Why too cool, or too hot, is a problem</h3>${p('Too cool before laying and compaction: hard to spread, hard to compact to the required density. Overheated during production: the binder can age or degrade.')}<p class="ap-label">Ten temperature stages</p><ol class="hma-ol">${TSTAGES.map(s => `<li>${s[0]}</li>`).join('')}</ol></div>
      ${fig('hot-mix-asphalt-temperature-check', 'A temperature check on delivered mix', 'A technician in orange and grey work clothes pushing a temperature probe into hot black asphalt in a truck body')}
    </div>
    <h3 class="ap-h3" style="margin-top:44px" id="tempToolTitle">Plot your project's approved ranges</h3>
    <div class="ap-prose" data-rv><p>Enter the lowest and highest approved temperature for each stage from your project specification or approved mix design. The chart is drawn in your browser from your numbers, and nothing is stored or sent. Leave a stage blank if you do not have its range.</p></div>
    <div class="s3d-box ex-box hma-temp hma-tool" id="hmaTemp">
      <div class="hma-tool-grid">
        <div class="hma-tool-form"><table class="hma-tbl"><caption>Approved temperature range per stage, °C</caption><thead><tr><th scope="col">Stage</th><th scope="col">Lowest °C</th><th scope="col">Highest °C</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="hma-tool-foot"><button type="button" class="btn btn-ghost" id="hmaTempClear">Clear all values</button></div></div>
        <div class="hma-tool-chart"><svg id="hmaTempSvg" viewBox="0 0 640 470" role="img" aria-label="Chart of approved temperature ranges for each stage. It stays empty until you enter values."></svg>
          <ul class="hma-key" aria-hidden="true"><li><i class="k rng"></i>Your approved range for the stage</li></ul>
          <p class="ap-small hma-msg" id="hmaTempMsg" aria-live="polite">The chart is empty until you enter values.</p></div>
      </div>
    </div>`);
}

/* ============ transport and dispatch ============ */
function transport() {
  return sec('transport', '', `
    ${head('transport', 'Transport and dispatch', 'The production process continues beyond the plant.', 'Hot Mix must reach the construction site in a suitable condition for laying and compaction. The transport operation is coordinated with the paving process.')}
    <div class="hma-trio">
      ${fig('hot-mix-asphalt-tipper-loading', 'Loading at the plant discharge', 'A tipper truck below the plant discharge chute receiving fresh black Hot Mix, with a technician in a high-visibility vest nearby')}
      ${fig('hot-mix-asphalt-dispatch-weighbridge', 'Weighed and dispatched', 'A loaded tipper with a covered Hot Mix load on a weighbridge beside a control cabin')}
      ${fig('industrial-asphalt-access-road', 'On the road to site', 'A freshly surfaced road with trucks driving along it past industrial buildings')}
    </div>
    <ol class="hma-seq" data-rv><li>Finished mix loading</li><li>Truck covering</li><li>Vehicle departure</li><li>Road journey</li><li>Arrival at the site</li><li>Temperature inspection</li><li>Paver receives the mix</li></ol>
    <div class="ap-prose wmd-flow" style="margin-top:26px">
      ${card('Factors affecting delivery', ul(['Plant location, site location and travel distance.', 'Traffic and weather.', 'Truck body condition and covering arrangement.', 'Loading time and unloading arrangement.', 'Paver availability.', 'Road closure or traffic-control window.']))}
      ${card('Why delivery timing matters', p('Hot Mix should reach the site when the paving operation is ready. Uncoordinated delivery can cause truck queues, delayed unloading, material cooling, disrupted paving and reduced production efficiency.'))}
    </div>`, { bone: true });
}

/* ============ road preparation, prime and tack coat ============ */
function layerSvg(kind) {
  const r = rng(kind === 'prime' ? 7 : 19), st = (n, y0, y1, c) => Array.from({ length: n }, () => `<ellipse cx="${(r() * 290 + 5).toFixed(0)}" cy="${(y0 + r() * (y1 - y0)).toFixed(0)}" rx="${(3 + r() * 5).toFixed(1)}" ry="${(2.4 + r() * 3).toFixed(1)}" fill="${c}" opacity="${(.55 + r() * .4).toFixed(2)}"/>`).join('');
  if (kind === 'prime') return `<svg viewBox="0 0 300 150" role="img" aria-label="Prime coat: a thin bituminous film sprayed onto a prepared granular base, soaking into the top of the granular surface, with the next layer still to come"><rect x="0" y="100" width="300" height="50" fill="#8c6f58"/><rect x="0" y="62" width="300" height="38" fill="#b9b4a8"/>${st(34, 66, 98, '#8d8f92')}${st(18, 66, 98, '#d5d1c8')}<rect x="0" y="60" width="300" height="9" fill="#17181b"/><path d="M0 69h300" stroke="#17181b" stroke-width="5" opacity=".55" stroke-dasharray="3 5"/><g class="sp">${[40, 90, 140, 190, 240].map(x => `<path d="M${x} 6v40" stroke="#ff5e29" stroke-width="2" stroke-dasharray="2 4"/><path d="M${x - 4} 40l4 8 4-8" fill="none" stroke="#ff5e29" stroke-width="2"/>`).join('')}</g><text x="8" y="144" fill="#fff" font-size="10" font-weight="600">Subgrade</text><text x="8" y="94" fill="#2a2b2e" font-size="10" font-weight="600">Prepared granular base</text><text x="292" y="20" text-anchor="end" fill="#ff5e29" font-size="10.5" font-weight="700">Prime coat, sprayed</text></svg>`;
  return `<svg viewBox="0 0 300 150" role="img" aria-label="Tack coat: a thin uniform film between two bituminous layers, the lower layer clean and the upper layer being laid over it"><rect x="0" y="108" width="300" height="42" fill="#b9b4a8"/><rect x="0" y="66" width="300" height="42" fill="#2a2b2e"/>${st(30, 70, 104, '#4a4c50')}<rect x="0" y="64" width="300" height="4" fill="#ff5e29"/><rect x="0" y="22" width="300" height="42" fill="#1c1d20"/>${st(30, 26, 60, '#3d3f43')}<text x="8" y="142" fill="#2a2b2e" font-size="10" font-weight="600">Base course</text><text x="8" y="92" fill="#e9e9ea" font-size="10" font-weight="600">Existing bituminous layer, clean</text><text x="8" y="46" fill="#e9e9ea" font-size="10" font-weight="600">New layer being laid</text><text x="292" y="58" text-anchor="end" fill="#ff5e29" font-size="10.5" font-weight="700">Tack coat: thin, uniform</text></svg>`;
}
function preparation() {
  const steps = [['Assess the foundation or existing pavement', 'The treatment depends on whether the project is new construction, overlay, resurfacing, rehabilitation, widening or localised repair.'], ['Prepare the surface', 'Clean it, remove loose material, correct defects, mill or correct levels, and prepare the underlying course to the required profile.'], ['Apply prime coat, where specified', 'On a suitable prepared granular surface, to prepare it for the next bituminous layer and help bind loose particles.'], ['Apply tack coat, where specified', 'A thin, uniform application to promote bonding between specified pavement layers, on a clean surface.'], ['Receive the Hot Mix', 'The mix arrives in suitable vehicles and the site team checks it before placement.'], ['Pave, roll, inspect', 'Paver, screed, initial, intermediate and finish rolling, then inspection. The pavement opens to traffic only when the specification and the Engineer permit.']];
  return sec('preparation', '', `
    ${head('preparation', 'Road preparation', 'A good asphalt layer begins with a properly prepared surface.', 'Manufacturing the mix is only one part of the process. The road must also be prepared and constructed correctly.')}
    <ol class="hma-steps" data-rv>${steps.map((s, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><div><h3 class="ap-h4">${s[0]}</h3><p>${s[1]}</p></div></li>`).join('')}</ol>
    <h3 class="ap-h3" style="margin-top:48px">Prime coat and tack coat: two different jobs</h3>
    <div class="hma-two">
      <figure class="hma-cap" data-rv>${layerSvg('prime')}<figcaption><b>Prime coat</b> on a prepared granular base. A thin film, not a layer of Hot Mix.</figcaption></figure>
      ${fig('prime-coat-road-construction', 'Prime coat sprayed on a granular road base', 'A tanker spraying prime coat across a prepared granular road base with a site supervisor in a high-visibility vest watching')}
      <figure class="hma-cap" data-rv>${layerSvg('tack')}<figcaption><b>Tack coat</b> between two bituminous layers. Thin and uniform, on a clean surface.</figcaption></figure>
    </div>
    ${tbl('Prime coat and tack coat compared', ['Parameter', 'Prime coat', 'Tack coat'], [
      ['Typical location', 'Prepared granular base', 'Between specified pavement layers'], ['Main purpose', 'Prepare and bind the granular surface', 'Promote bonding between layers'],
      ['Material', 'Specified bituminous primer or emulsion', 'Specified tack-coat binder or emulsion'], ['Application', 'Uniform distribution', 'Thin, uniform application'], ['Acceptance', 'Project specification', 'Project specification']])}
    ${small('The applicable MoRTH specification, tender and material type govern the actual requirements. IS 8887 covers bitumen emulsion for specified applications.')}`, { bone: true });
}

/* ============ paving explorer ============ */
function paverSvg() {
  return `<svg viewBox="0 96 780 188" role="img" aria-label="Side view of paving: a tipper tilts and discharges Hot Mix into the paver hopper; a conveyor carries it back under the paver; an auger spreads it across the width; the screed levels it into a mat; a roller follows behind. The paver travels towards the tipper.">
    <rect class="gnd" x="0" y="238" width="780" height="3"/>
    <path class="mat" d="M392 224H780V238H392z"/><path class="mat top" d="M392 224H780"/>
    <g class="pv-tipper"><path class="tr" d="M6 190L132 156L150 188L24 228z"/><rect class="trc" x="0" y="214" width="112" height="14" rx="3"/><circle class="whl" cx="26" cy="232" r="9"/><circle class="whl" cx="70" cy="232" r="9"/><path class="mix" d="M138 164L168 214" /></g>
    <g class="pv-roller"><rect class="rl" x="628" y="170" width="120" height="48" rx="8"/><circle class="drm" cx="652" cy="220" r="16"/><circle class="drm" cx="724" cy="220" r="16"/><rect class="cab" x="676" y="136" width="52" height="40" rx="5"/></g>
    <g class="pv-paver"><rect class="body" x="172" y="150" width="236" height="58" rx="10"/><rect class="cab" x="298" y="108" width="62" height="46" rx="5"/><rect class="trk" x="186" y="204" width="214" height="34" rx="17"/>${[212, 262, 312, 362].map(x => `<circle class="whl" cx="${x}" cy="221" r="9"/>`).join('')}</g>
    <g class="pv-hopper"><path class="hp" d="M146 122H252L232 176H168z"/><path class="mix" d="M156 130H244L228 160H170z"/></g>
    <g class="pv-conv"><rect class="cv" x="190" y="186" width="184" height="12" rx="6"/>${[0, 1, 2, 3, 4].map(i => `<rect class="mv" x="${204 + i * 36}" y="180" width="12" height="6" rx="2" style="--d:${i * .3}s"/>`).join('')}</g>
    <g class="pv-auger"><rect class="ag" x="388" y="196" width="20" height="26" rx="4"/><path class="aw" d="M386 198l8 8-8 8 8 8M406 198l-8 8 8 8-8 8"/><path class="spread" d="M380 218H420"/></g>
    <g class="pv-screed"><path class="arm" d="M372 190L430 214"/><rect class="sc" x="414" y="214" width="50" height="14" rx="4"/></g>
    <path class="dir" d="M130 268H20M34 262l-14 6 14 6"/><text class="lb" x="76" y="257" text-anchor="middle">Direction of travel</text>
    <text class="lb" x="52" y="150">Tipper</text><text class="lb" x="199" y="108">Hopper</text>
    <path class="ldr" d="M290 198V240M404 222V240"/><text class="lb" x="290" y="256" text-anchor="middle">Conveyor</text><text class="lb" x="404" y="256" text-anchor="middle">Auger</text>
    <text class="lb" x="446" y="206">Screed</text><text class="lb" x="688" y="126" text-anchor="middle">Roller</text><text class="lb" x="560" y="214">Fresh mat</text>
  </svg>`;
}
/* the paving train in 3D (shared engine, scene 'hmapave': assets/application-s3d-hmapave.js, models from scripts/hma3d/build-paving.py); the buttons move the camera */
function paver3d(P) {
  const poster = n => `/img/applications/hot-mix-asphalt/s3d/hma-paving-${n}.webp`;
  const alt = 'A paving train in 3D: an OM GROUP tipper discharging Hot Mix into the hopper of a tracked asphalt paver, the paver laying a steaming mat behind its screed, and a tandem steel-drum roller compacting the mat';
  const V = [['all', 'Whole train', 'The paving train', 'Tipper, paver and roller work as one train', 'The tipper discharges the Hot Mix into the hopper at the front of the paver, the paver spreads it across the prepared surface, and rolling follows behind the paver.']].concat(P.map(x => [x[0], x[1], x[1], x[4], x[5]]));
  return `<div class="s3d-box s3d-wide hma-pave3d" data-s3d="hmapave" data-evbox="hot_mix_process_interaction" data-init='{"view":"all"}'>
      <div class="s3d-grid">
        <figure class="s3d-fig"><div class="s3d-stage"><img class="s3d-poster" src="${poster(1000)}" srcset="${poster(640)} 640w, ${poster(1000)} 1000w" sizes="(max-width:1000px) 92vw, 60vw" width="1000" height="625" alt="${alt}" loading="lazy" decoding="async" /><canvas class="s3d-cv" tabindex="0" role="img" aria-label="${alt}. Drag to turn the view; use the arrow keys when focused."></canvas><div class="s3d-labels"></div><div class="s3d-tools"><button type="button" data-zoom="out" aria-label="Zoom out">−</button><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" class="rs" data-zoom="reset" aria-label="Reset the view">Reset</button></div><div class="s3d-hint" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>Drag to turn</div></div><figcaption>The paving train at work. The Conveyor and Auger views cut away the near half of the paver to show the mix inside.</figcaption></figure>
        <div class="s3d-ctl"><p class="s3d-lbl">Choose a part of the paving train</p><div class="s3d-seg" role="group" aria-label="Choose a part of the paving train">${V.map((x, i) => `<button type="button" data-set="view:${x[0]}" aria-pressed="${i === 0}">${x[1]}</button>`).join('')}</div>
          <div class="s3d-read" aria-live="polite">${V.map(x => `<div data-when="view:${x[0]}"><span class="tag">${x[2]}</span><h4>${x[3]}</h4><p>${x[4]}</p></div>`).join('')}</div>
        </div>
      </div>
    </div>`;
}
function paving() {
  const P = [
    ['hopper', 'Hopper', 'asphalt-paver-hot-mix-laying', 'An asphalt paver and its screed laying a fresh mat', 'The hopper receives the mix', 'The tipper discharges the Hot Mix into the hopper at the front of the paver. The paver and the tipper work together at a steady pace so the mix keeps flowing.'],
    ['conv', 'Conveyor', 'asphalt-paver-hot-mix-laying', 'An asphalt paver laying a fresh mat', 'The conveyor carries it back', 'Slat conveyors move the mix from the hopper through the paver towards the rear, ready for the auger.'],
    ['auger', 'Auger', 'asphalt-paver-hot-mix-laying', 'The rear of an asphalt paver with its auger and screed', 'The auger spreads it across the width', 'Augers distribute the mix evenly across the paving width in front of the screed.'],
    ['screed', 'Screed', 'asphalt-paver-hot-mix-laying', 'An asphalt paver screed forming a uniform mat', 'The screed sets the mat', 'The screed helps establish the width, level, initial profile and surface uniformity, and the mat thickness. The final compacted thickness follows the project specification. Level and slope controls guide it.'],
    ['roller', 'Roller', 'tandem-roller-asphalt-compaction', 'A tandem steel-drum roller compacting a fresh asphalt mat', 'The roller compacts the mat', 'Rolling follows behind the paver while the mix is within its compaction temperature window, to reach the specified density and surface profile.']
  ];
  const pavPhoto = (slug, alt) => fig(slug, '', alt, { rv: false, sizes: '(max-width:899px) 92vw, 480px' });
  const states = P.map(x => [`<div class="hma-pvfig">${paverSvg()}</div>`, `<span class="tag">Paving</span><h4>${x[4]}</h4><p>${x[5]}</p>`]);
  return sec('paving', '', `
    ${head('paving', 'Interactive 07 · Paving process explorer', 'Controlled placement creates the pavement profile.', 'The asphalt paver receives the mix and spreads it across the prepared surface. The conveyor, auger and screed work together to distribute and level the material, to the specified width, thickness, profile, crossfall and surface consistency.')}
    ${paver3d(P)}
    <div class="hma-two" style="margin-top:36px">${fig('asphalt-paver-hot-mix-laying', 'The paver and its screed', 'A close view of an asphalt paver screed forming a fresh black Hot Mix mat')}${fig('hot-mix-asphalt-road-construction', 'Plant, tipper, paver and roller', 'A plant with a tipper, an asphalt paver and a roller on a fresh road surface')}</div>
    ${ctaRow('paving', 'req')}`);
}

/* ============ compaction ============ */
function compactSvg(level) {
  const r = rng(11), W = 300, H = 120, cols = 13, rows = 5, gap = [1.0, .88, .76][level], cw = W / cols * .94 * gap + 2, ch = H / rows * .72 * gap + 3;
  const top = [18, 30, 40][level];
  let s = `<svg viewBox="0 0 ${W} ${H + 40}" role="img" aria-label="Aggregate arrangement in the asphalt mat ${['after the paver, loose', 'after intermediate rolling, closer', 'after finish rolling, dense'][level]}"><rect x="0" y="${top}" width="${W}" height="${H + 40 - top}" fill="#0f1012"/>`;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const rr = 5.2 + r() * 5.4, x = i * (W / cols) + (j % 2 ? W / cols / 2 : 0) + (r() - .5) * 7 * gap, y = top + 12 + j * (H / rows) * (.72 + .28 * gap) + (r() - .5) * 6 * gap;
    if (x < 6 || x > W - 6) continue;
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(rr * (1.05 - .1 * level)).toFixed(1)}" ry="${(rr * .78).toFixed(1)}" fill="${['#5b5d62', '#6c6e73', '#4c4e53', '#797b80'][Math.floor(r() * 4)]}" stroke="#8e9096" stroke-width=".7" transform="rotate(${(r() * 90 - 45).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
  }
  return s + `<rect x="0" y="${top - 2}" width="${W}" height="3" fill="#ff5e29" opacity=".8"/></svg>`;
}
function compaction() {
  const C = [['ini', 'Initial rolling', 'tandem-roller-asphalt-compaction', 'An orange tandem steel-drum roller on a fresh asphalt mat', 'A steel-drum roller makes the first pass behind the paver, while the mix is within the specified compaction temperature window.', 0], ['mid', 'Intermediate rolling', 'urban-asphalt-road-construction', 'A paver and rollers working on an urban road', 'Additional compaction with suitable equipment and a defined rolling pattern. A pneumatic tyre roller may be used where the approved method requires it.', 1], ['fin', 'Finish rolling', 'compacted-asphalt-surface-texture', 'A compacted, uniform black asphalt surface', 'A finishing pass achieves the required surface texture and profile without damaging the finished layer.', 2]];
  const states = C.map(c => [`<div class="hma-cfig">${fig(c[2], c[1], c[3], { rv: false, sizes: '(max-width:899px) 92vw, 480px' })}</div>`, `<span class="tag">Stage ${c[5] + 1} of 3</span><h4>${c[1]}</h4><p>${c[4]}</p>`]);
  return sec('compaction', '', `
    ${head('compaction', 'Rolling and compaction', 'Compaction develops the required pavement structure.', 'After placement, the asphalt is compacted according to the approved rolling pattern. Compaction is essential to the density and volumetric structure of the pavement. It reduces excessive air voids, improves particle contact, develops the intended structure and helps achieve the surface profile.')}
    ${ex('hma-comp', 'cp', C.map(c => [c[0], c[1]]), states, { label: 'Choose a rolling stage', ev: 'hot_mix_process_interaction' })}
    <div class="hma-cutrow" data-rv><p class="ap-label">The cut face of the mat, stage by stage</p><div class="hma-cutrow-g">${C.map((c, i) => `<figure class="hma-cap hma-cut" data-cut="${c[0]}">${compactSvg(i)}<figcaption><b>${['After the paver', 'After intermediate rolling', 'After finish rolling'][i]}</b><br>${['Looser, more space between the stones', 'Stones settling closer together', 'A dense, closed structure'][i]}</figcaption></figure>`).join('')}</div><p class="ap-small">Schematic cut faces, not to scale. No density value is shown.</p></div>
    <h3 class="ap-h3" style="margin-top:44px">Roller types</h3>
    ${tbl('Roller types used on asphalt', ['Roller', 'How it works'], [['Tandem steel drum roller', 'Steel drums compact the asphalt layer'], ['Pneumatic tyre roller', 'Multiple rubber tyres apply pressure over the surface, where included in the approved rolling procedure'], ['Combination roller', 'Different compaction arrangements depending on the machine configuration'], ['Finish roller', 'A steel-drum roller may be used for final finishing where required']])}
    ${warn('<strong>Not every project needs every roller type.</strong> The required compaction and rolling sequence follow the project specification. Insufficient or poorly controlled compaction can lead to excessive air voids, permeability, premature deterioration and moisture susceptibility; inappropriate rolling can damage the layer. No density value is shown.')}`, { bone: true });
}

/* ============ finished pavement ============ */
function finished() {
  return sec('finished', '', `
    <div class="hma-pair">
      <div class="ap-prose" data-rv><p class="ap-kicker">The finished pavement</p><h2 class="ap-h2" id="finishedTitle">The result is a completed bituminous pavement layer.</h2><p class="ap-lede">A properly designed and constructed asphalt pavement has to satisfy the project requirements.</p>${ul(['Mix properties and layer thickness.', 'Density and surface regularity.', 'Drainage and joints.', 'Construction quality.'])}${warn('<strong>The final road performance depends on the entire pavement system, not merely the Hot Mix.</strong> Hot Mix alone does not guarantee a durable road.')}</div>
      ${fig('finished-asphalt-highway', 'A finished carriageway', 'A completed asphalt highway with lane markings curving between a tree-covered hillside and the sea')}
    </div>`);
}

/* ============ defects: eight technical cross-sections ============ */
function defSvg(k) {
  const r = rng({ rut: 3, fat: 5, the: 7, rav: 9, ble: 13, str: 17, seg: 21, pot: 25 }[k]);
  const stones = (n, x0, x1, y0, y1, c, rmin = 2.2, rmax = 5) => Array.from({ length: n }, () => `<ellipse cx="${(x0 + r() * (x1 - x0)).toFixed(0)}" cy="${(y0 + r() * (y1 - y0)).toFixed(0)}" rx="${(rmin + r() * (rmax - rmin)).toFixed(1)}" ry="${((rmin + r() * (rmax - rmin)) * .75).toFixed(1)}" fill="${c}" opacity="${(.6 + r() * .35).toFixed(2)}"/>`).join('');
  const base = (top = 46) => `<rect x="0" y="${top + 34}" width="280" height="34" fill="#b9b4a8"/><rect x="0" y="${top + 68}" width="280" height="40" fill="#8c6f58"/>${stones(18, 4, 276, top + 38, top + 64, '#8d8f92')}`;
  const asph = (top = 46, d = '') => `<path d="M0 ${top}H280V${top + 34}H0z" fill="#2a2b2e"/>${stones(40, 4, 276, top + 4, top + 30, '#505257')}`;
  const L_ = (x, y, t) => `<text x="${x}" y="${y}" font-size="9.5" font-weight="700" fill="#ff5e29">${t}</text>`;
  let b = '';
  if (k === 'rut') b = `${base(46)}<path d="M0 46H70Q90 56 110 58 130 56 150 46 170 56 190 58 210 56 230 46H280V80H0z" fill="#2a2b2e"/>${stones(40, 4, 276, 56, 78, '#505257')}<path d="M0 46H70Q90 56 110 58 130 56 150 46 170 56 190 58 210 56 230 46H280" fill="none" stroke="#ff5e29" stroke-width="2"/><path d="M110 18v22M106 34l4 8 4-8M190 18v22M186 34l4 8 4-8" stroke="#ff5e29" fill="none" stroke-width="2"/>${L_(8, 22, 'Wheel-path depressions')}`;
  if (k === 'fat') b = `${base()}${asph()}<g fill="none" stroke="#ff5e29" stroke-width="1.8"><path d="M40 80l6-14 -4-12 8-8"/><path d="M92 80l-5-12 7-12-3-10"/><path d="M150 80l8-10-3-14 6-9"/><path d="M214 80l-6-12 8-12-4-8"/><path d="M92 74l24-3M150 72l-22-2M46 70l-18 4"/></g>${L_(8, 36, 'Interconnected cracks, from the bottom up')}`;
  if (k === 'the') b = `${base()}${asph()}<path d="M138 46l4 14-3 10 3 10-2 10" fill="none" stroke="#ff5e29" stroke-width="2.4"/><path d="M112 40L100 40M168 40H180M100 36l-8 4 8 4M180 36l8 4-8 4" stroke="#ff5e29" fill="none" stroke-width="1.8"/>${L_(8, 30, 'Temperature-driven tension, a transverse crack')}`;
  if (k === 'rav') b = `${base()}${asph()}${[30, 52, 80, 110, 138, 170, 206, 238].map((x, i) => `<path d="M${x} 46q4 7 8 0z" fill="#e8e6e0"/>`).join('')}${stones(10, 6, 274, 40, 44, '#505257', 2, 3.5)}<path d="M0 46H280" stroke="#ff5e29" stroke-width="1.6" stroke-dasharray="3 4"/>${L_(8, 22, 'Stones lost from the surface')}`;
  if (k === 'ble') b = `${base()}${asph()}<rect x="0" y="44" width="280" height="6" fill="#0c0c0e"/><path d="M12 47h50M92 46h70M190 47h72" stroke="#fff" stroke-width="1.2" opacity=".55"/>${L_(8, 30, 'Binder-rich, glossy surface film')}`;
  if (k === 'str') b = `${base()}${asph()}<g fill="none" stroke="#ff5e29" stroke-width="1.6" stroke-dasharray="3 3">${[52, 118, 184, 238].map(x => `<ellipse cx="${x}" cy="70" rx="14" ry="6"/>`).join('')}</g>${[52, 118, 184, 238].map(x => `<path d="M${x - 8} 82q8 8 16 0" fill="none" stroke="#4a8fd4" stroke-width="1.6"/>`).join('')}${L_(8, 30, 'Binder film loses adhesion to the stone, with water')}`;
  if (k === 'seg') b = `${base()}<path d="M0 46H280V80H0z" fill="#2a2b2e"/>${stones(14, 6, 104, 52, 76, '#6f7176', 6, 10)}${stones(70, 150, 276, 50, 78, '#505257', 1.6, 3)}<path d="M128 40v44" stroke="#ff5e29" stroke-dasharray="3 3" stroke-width="1.6"/>${L_(10, 38, 'Coarse-rich')}${L_(168, 38, 'Fine-rich')}`;
  if (k === 'pot') b = `${base()}<path d="M0 46H92Q104 70 140 74 176 70 188 46H280V80H0z" fill="#2a2b2e"/><path d="M92 46Q104 70 140 74 176 70 188 46V84H92z" fill="#8c6f58"/><path d="M104 62Q140 82 176 62Q172 50 140 50Q108 50 104 62z" fill="#4a8fd4" opacity=".7"/><path d="M132 22v20M128 36l4 8 4-8" stroke="#4a8fd4" fill="none" stroke-width="2"/>${stones(22, 4, 90, 52, 76, '#505257')}${stones(22, 190, 276, 52, 76, '#505257')}${L_(8, 22, 'Material displaced, water enters')}`;
  return `<svg viewBox="0 8 280 144" role="img" aria-label="Pavement cross-section showing the defect described beside it">${b}</svg>`;
}
function defects() {
  const D = [
    ['rut', 'Rutting', 'A longitudinal depression in the wheel paths.', ['Inadequate mix stability and excessive deformation.', 'Poor compaction and weak underlying layers.', 'Heavy traffic and high pavement temperatures.'], 'Mix design that suits the traffic and climate, a suitable binder, and compaction to the specified density.'],
    ['fat', 'Fatigue cracking', 'Interconnected cracks that develop under repeated traffic loading.', ['Repeated loading and structural inadequacy.', 'Insufficient pavement thickness.', 'Material deterioration and moisture-related damage.'], 'Adequate pavement design and thickness, a sound foundation and drainage.'],
    ['the', 'Thermal cracking', 'Temperature changes create tensile stresses in the bituminous pavement.', ['Binder properties and the local climate.', 'Pavement conditions.'], 'Binder selection suited to the climate, as the approved mix design requires.'],
    ['rav', 'Ravelling', 'Progressive loss of aggregate particles from the pavement surface.', ['Poor aggregate coating and insufficient binder.', 'Poor compaction, ageing and moisture damage.'], 'Correct binder content, good coating and compaction.'],
    ['ble', 'Bleeding or flushing', 'Excess binder at the surface gives a shiny or sticky appearance.', ['Excess binder and low air voids.', 'Mix design issues, binder migration and construction problems.'], 'A mix designed through the approved procedure and controlled binder content in production.'],
    ['str', 'Stripping', 'Loss of adhesion between bitumen and aggregate in the presence of moisture.', ['Moisture and unsuitable aggregate-binder interaction.', 'Inadequate drainage and material contamination.', 'Inadequate anti-stripping measures where needed.'], 'Compatible materials, moisture-susceptibility testing where required, good drainage and anti-stripping measures where the design needs them.'],
    ['seg', 'Segregation', 'An uneven distribution of coarse and fine aggregate in the mixture or the placed mat.', ['Material handling and stockpile management.', 'Truck loading and discharge.', 'Paver operation.'], 'Careful handling, stockpiling, loading and paver operation.'],
    ['pot', 'Potholes', 'Pavement material deteriorates and is displaced.', ['Water ingress and traffic.', 'Cracking and loss of material.', 'Underlying structural failure.'], 'Sealing cracks early, good drainage and sound construction. Repairs follow the contract and the repair method.']
  ];
  return sec('defects', '', `
    ${head('defects', 'Common pavement defects', 'Understand the problems that good design and construction help control.', 'This section helps explain why asphalt mix design and construction quality matter. Each card shows a technical cross-section of the defect, its common contributing factors and the considerations that help control it.')}
    <div class="hma-defs">${D.map((d, i) => `<article class="hma-def" data-rv><div class="hma-def-fig">${require("../../hma3d/def-figs").figHtml(d[0]).replace(/^<div class="hma-def-fig">|</div>$/g, "")}</div><div class="hma-def-tx"><span class="hma-type-n">${String(i + 1).padStart(2, '0')}</span><h3 class="ap-h4">${d[1]}</h3><p>${d[2]}</p><p class="ap-label">Common contributing factors</p>${ul(d[3])}<p class="ap-label">Prevention and control</p><p>${d[4]}</p></div></article>`).join('')}</div>
    ${warn('<strong>No single mix characteristic prevents every defect, and a defect is not always caused by the mix alone.</strong> Pavement design, drainage, the subgrade, traffic and construction quality all matter. The drawings are simplified cross-sections, not to scale.')}`, { bone: true });
}

module.exports = { quality, temperature, transport, preparation, paving, compaction, finished, defects };
