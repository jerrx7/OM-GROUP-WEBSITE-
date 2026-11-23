const L = require('../lib');
const R3 = require('./render3d');
const { pic, fig, sec, head, p, ul, card, grid, warn, small, ans, tbl, ex, ctaRow } = L;

/* ============ quick answer ============ */
function quick() {
  return sec('quick-answer', '', `
    <p class="ap-kicker">Quick answer</p>
    <h2 class="ap-h2" id="quick-answerTitle">What is Hot Mix Asphalt?</h2>
    ${ans('What is Hot Mix Asphalt?', '<strong>Hot Mix Asphalt is a bituminous pavement material manufactured by combining selected mineral aggregates, mineral filler and bituminous binder in controlled proportions.</strong> The ingredients are heated and mixed in an asphalt plant to produce a uniform mixture that can be transported, laid and compacted according to the approved road construction specification.')}
    ${tbl('Hot Mix Asphalt at a glance', ['Parameter', 'Description'], [
      ['Product', 'Hot Mix Asphalt'], ['Common abbreviation', 'HMA, often simply "Hot Mix"'], ['Material type', 'Bituminous pavement mixture'],
      ['Main components', 'Coarse aggregate, fine aggregate, mineral filler and bitumen'], ['Production', 'Controlled hot mixing'],
      ['Common mix types', 'DBM and BC, among others'], ['Main application', 'Flexible pavement construction'], ['Supply form', 'Finished hot asphalt mixture'],
      ['Quantity', 'Usually specified by mass or contract measurement'], ['Design', 'Approved mix design / Job Mix Formula (JMF)'], ['Quality control', 'Laboratory and field testing']])}
    <div class="hma-pair">
      <div class="ap-prose" data-rv><h3 class="ap-h3">Think of it as engineered stone and bitumen</h3>${p('Stone forms the mineral structure. Fine aggregate fills the spaces between larger particles. Mineral filler contributes the finest fraction of the aggregate-binder system. Bitumen binds and coats the mineral particles. Controlled mixing makes the material consistent, and compaction on the road creates the pavement structure.', 'The proportions come from the approved mix design, not from visual estimation.')}</div>
      ${fig('hot-mix-asphalt-surface-texture', 'Coated aggregate, close up', 'A close-up of Hot Mix Asphalt: angular crushed stone particles coated in glossy black bitumen')}
    </div>
    <h3 class="ap-h3" style="margin-top:44px">Bitumen is not asphalt</h3>
    <div class="ap-prose" data-rv>${p('When a contractor orders Hot Mix, they are not ordering pure bitumen. They are ordering a specified mixture with an approved aggregate grading, binder type, binder content, mineral filler content, mix design, and production and construction requirements.')}</div>
    ${tbl('Bitumen, asphalt mixture and related terms', ['Term', 'Meaning'], [
      ['Bitumen', 'A petroleum-derived, black, viscous binder used in road construction'],
      ['Asphalt mixture', 'A mixture of mineral aggregates and bituminous binder'],
      ['Hot Mix Asphalt', 'An asphalt mixture manufactured and handled using a hot-mix process'],
      ['Asphalt pavement', 'The finished pavement layer or system constructed using bituminous materials'],
      ['Bituminous concrete', 'A specified dense bituminous wearing-course mixture in Indian road specifications'],
      ['DBM', 'Dense Bituminous Macadam, commonly used as a binder/base course material in flexible pavements']])}
    ${ctaRow('quick_answer', 'req', 'spec')}`);
}

/* ============ direct answers ============ */
function answers() {
  const A = [
    ['What is Hot Mix Asphalt?', 'A bituminous pavement mixture produced by combining selected mineral aggregates, mineral filler and bituminous binder in controlled proportions. The materials are heated and mixed before being transported, laid and compacted to form a pavement layer.'],
    ['What are the main ingredients of Hot Mix?', 'Coarse aggregate, fine aggregate, mineral filler and bituminous binder. Additives or modifiers may also be used when the approved mix design specifies them.'],
    ['What is DBM?', 'Dense Bituminous Macadam is a dense graded bituminous mixture commonly used as a binder or base course in flexible pavement construction.'],
    ['What is BC?', 'Bituminous Concrete is a dense graded bituminous mixture commonly used as the wearing course in a flexible pavement.'],
    ['What is the difference between DBM and BC?', 'DBM commonly forms a structural bituminous layer beneath the wearing course, while BC commonly forms the upper pavement surface. Their actual specifications depend on the project design.'],
    ['How is Hot Mix Asphalt manufactured?', 'By proportioning aggregate fractions, drying and heating the aggregates, adding specified binder and filler, mixing the materials, inspecting the finished mixture and discharging it for transport.'],
    ['What is a Job Mix Formula?', 'The approved mix design that defines the aggregate grading, binder type, binder content and other specified mixture parameters.'],
    ['What is Marshall Mix Design?', 'A method used to evaluate and select bituminous mixture proportions through prepared specimens and measurements such as stability, flow and volumetric properties.'],
    ['What is the difference between batch and drum-mix plants?', 'A batch plant produces individual measured batches using separate weighing and mixing stages. A drum-mix plant produces the mixture continuously through an integrated production process.'],
    ['Why is temperature important in Hot Mix?', 'Temperature influences binder viscosity, mixing, workability, transportation and compaction. The required operating range depends on the binder, mix design and project specification.'],
    ['What is prime coat?', 'A specified bituminous treatment applied to a suitable prepared granular surface before the subsequent pavement layer.'],
    ['What is tack coat?', 'A specified bituminous application used to promote bonding between pavement layers.'],
    ['Why is compaction important?', 'Compaction helps achieve the required pavement density, aggregate contact, volumetric structure and surface profile.'],
    ['How is Hot Mix quantity calculated?', 'For a uniform rectangular road section, theoretical compacted volume is length times width times compacted thickness. Multiplying the volume by the approved compacted density gives the theoretical mass.'],
    ['What tests are performed on Hot Mix?', 'Depending on the mix and project: aggregate gradation, binder content, bulk specific gravity, maximum theoretical specific gravity, air voids, VMA, VFB, Marshall properties, density and core testing.'],
    ['How do I enquire about Hot Mix in Goa?', '<strong>Share the mix type, governing specification, quantity, delivery location and schedule with OM GROUP.</strong> OM GROUP\'s catalogue covers crushed aggregates, GSB, WMM, boulders and other construction materials.']
  ];
  return sec('answers', '', `
    <p class="ap-kicker">Direct answers</p>
    <h2 class="ap-h2" id="answersTitle">Hot Mix Asphalt in Sixteen Short Answers</h2>
    <div class="ap-prose" data-rv><p class="ap-lede">The questions engineers, contractors and buyers ask first, answered plainly. The sections below explain each one in full.</p></div>
    <div class="wmd-answers">${A.map(a => ans(a[0], a[1])).join('')}</div>`, { bone: true });
}

/* ============ the product ============ */
function product() {
  return sec('product', '', `
    ${head('product', 'Understand the product', 'More than crushed stone and bitumen.', '', p('Hot Mix Asphalt is an engineered combination of materials. The aggregate structure, binder and filler work together to produce the required pavement properties.', 'A mix with too much or too little binder can behave differently from one that meets the approved design. A mixture with unsuitable grading, or one that is poorly compacted, can deteriorate early. That is why Hot Mix production follows a controlled process.'))}
    <div class="hma-wide">${fig('hot-mix-asphalt-ingredients', 'Coarse stone, fine aggregate and filler, then bitumen', 'Four ingredient piles on a grey studio floor: coarse crushed stone, fine aggregate, pale mineral filler, and a glass jug pouring bitumen over a heap of coated black asphalt', { sizes: '(max-width:899px) 92vw, 1100px', cls: 'hma-widefig' })}</div>
    <p class="ap-small hma-note">Every ingredient is selected and proportioned according to the approved mix design. No percentage is shown here.</p>
    <div class="hma-chain" data-rv><p class="ap-label">The central message</p><p class="hma-chain-q">The quality of a finished asphalt road begins with the quality and consistency of the mix.</p>
      <ol class="hma-chain-steps"><li>Raw materials</li><li>Proportioning</li><li>Heating and drying</li><li>Screening or continuous mixing</li><li>Bitumen addition</li><li>Finished mix</li><li>Quality inspection</li><li>Dispatch</li><li>Paving</li><li>Compaction</li><li>Finished pavement</li></ol></div>
    ${ctaRow('product', 'req')}`, { bone: true });
}

/* ============ ingredients explorer ============ */
function ingredients() {
  const S = (slug, alt, cap) => fig(slug, cap, alt, { rv: false, sizes: '(max-width:899px) 92vw, 520px' });
  const items = [
    ['coarse', 'Coarse aggregate', S('coarse-aggregate-for-asphalt', 'A heap of angular, freshly crushed grey stone, the coarse aggregate used in asphalt', 'Crushed coarse aggregate'),
      `<span class="tag">Ingredient 01</span><h4>Coarse aggregate: the mineral skeleton</h4>${p('Coarse aggregate forms a major part of the mineral structure. It is generally produced by crushing suitable rock and processing it into the required size fractions.')}<p class="ap-label">What matters</p>${ul(['Particle size and gradation.', 'Angularity, shape and surface texture.', 'Strength, abrasion and impact resistance.', 'Water absorption, durability and cleanliness.'])}<p class="ap-label">What it contributes</p>${ul(['Load distribution and aggregate interlock.', 'Resistance to deformation and stability of the mixture.'])}<p class="ap-small">Aggregate requirements depend on the mix type and project specification. See the <a class="ap-link" href="/products/20mm-aggregate">20mm</a>, <a class="ap-link" href="/products/10mm-aggregate">10mm</a> and <a class="ap-link" href="/products/6mm-aggregate">6mm</a> aggregate pages for crushed fractions.</p>`],
    ['fine', 'Fine aggregate', S('fine-aggregate-crop', 'A heap of fine crushed aggregate in mixed grey and pale particles beside a conveyor', 'Fine aggregate'),
      `<span class="tag">Ingredient 02</span><h4>Fine aggregate: completes the grading</h4>${p('Fine aggregate consists of smaller mineral particles. It helps complete the aggregate grading and contributes to the internal structure of the mix. It may include suitable crushed fine aggregate and other permitted sources.')}<p class="ap-label">What matters</p>${ul(['Particle-size distribution.', 'Cleanliness and particle shape.', 'Mineral properties and moisture content.', 'Compatibility with the mix design.'])}`],
    ['filler', 'Mineral filler', S('mineral-filler-crop', 'A pile of pale, very fine mineral filler powder on a steel laboratory tray', 'Mineral filler'),
      `<span class="tag">Ingredient 03</span><h4>Mineral filler: the finest fraction</h4>${p('Mineral filler is very fine mineral material. It contributes to the finer portion of the aggregate system and interacts with the bituminous binder.')}<p class="ap-label">It can influence</p>${ul(['Filler-binder interaction and mix consistency.', 'The voids structure and workability.', 'Moisture sensitivity.'])}<p class="ap-small">The type and quantity must comply with the approved mix design. Recovered fines from dust collection are used only where the specification and mix design permit.</p>`],
    ['binder', 'Bituminous binder', S('bitumen-binder-close-up', 'Hot black bitumen pouring in a smooth glossy stream from an insulated steel pipe into a drum', 'Bituminous binder'),
      `<span class="tag">Ingredient 04</span><h4>Bitumen: binds and coats</h4>${p('Bitumen is the binding material. It coats the aggregate particles and helps form a cohesive mixture.')}<p class="ap-label">Binder selection considers</p>${ul(['Climate and pavement temperature.', 'Traffic loading and project requirements.', 'The binder specification and mix-design performance.'])}`],
    ['additive', 'Additives and modifiers', S('bitumen-additive-filler-samples', 'Laboratory jars holding bitumen, white polymer pellets and a grey powder', 'Optional additives'),
      `<span class="tag">Ingredient 05 · where specified</span><h4>Additives and modifiers are project-specific</h4>${p('Some projects specify them. They are not automatically part of every Hot Mix.')}${ul(['Polymer-modified bitumen (PMB).', 'Crumb rubber modified bitumen (CRMB).', 'Anti-stripping additives.', 'Fibres.', 'Reclaimed Asphalt Pavement (RAP).', 'Other approved modifiers.'])}<p class="ap-small">Their use, type and dosage must be part of the approved mix design.</p>`],
    ['mix', 'The finished mix', S('hot-mix-asphalt-surface-texture', 'Hot Mix Asphalt close up: crushed stone particles fully coated in black bitumen', 'Coated mixture'),
      `<span class="tag">The result</span><h4>A uniform, coated mixture</h4>${p('Controlled mixing coats the mineral surfaces with a thin film of bitumen and produces a uniform mixture. Bitumen is not a pool around the stone: it is a coating on every particle.', 'The exact proportions are determined by the approved mix design and the applicable project specification.')}`]
  ];
  const fn = tbl('What each ingredient does', ['Ingredient', 'Main function', 'Main quality considerations'], [
    ['Coarse aggregate', 'Mineral skeleton and interlock', 'Strength, grading and durability'], ['Fine aggregate', 'Completes grading and fills smaller spaces', 'Grading, cleanliness and particle characteristics'],
    ['Mineral filler', 'Fine mineral component', 'Fineness and compatibility'], ['Bitumen', 'Binder and coating', 'Grade, viscosity and specification compliance'], ['Additives', 'Application-specific modification', 'Approved type, dosage and compatibility']]);
  return sec('ingredients', '', `
    ${head('ingredients', 'Interactive 01 · Hot Mix composition explorer', 'Four essential material components.', 'Every ingredient has a specific engineering function. Choose one to see what it is and what it does.')}
    ${ex('hma-ing', 'ing', items.map(i => [i[0], i[1]]), items.map(i => [i[2], i[3]]), { label: 'Choose an ingredient', ev: 'hot_mix_process_interaction', scroll: true })}
    <p class="ap-small">Particle sizes are not to scale. The pictures show no proportion, grading or test result.</p>
    ${fn}`);
}

/* ============ mix types ============ */
function types() {
  const T = [
    ['DBM', 'Dense Bituminous Macadam', 'A dense graded bituminous mixture generally used as a binder or base course within a flexible pavement, depending on the project design. It is the structural bituminous layer beneath the wearing course, not the final surface.'],
    ['BC', 'Bituminous Concrete', 'A dense graded bituminous mixture commonly used as a wearing course. It forms the upper bituminous layer, provides the finished riding surface and protects the layers beneath. It is a specified mix type, not simply any black asphalt.'],
    ['BM', 'Bituminous Macadam', 'A bituminous road construction material used in specified pavement applications. It differs from dense graded DBM in grading and intended structural role. Do not use BM and DBM as interchangeable names.'],
    ['SDBC', 'Semi-Dense Bituminous Concrete', 'A semi-dense graded bituminous mix used in specified road construction and surfacing applications. Its use depends on the governing specification and pavement design.'],
    ['SMA', 'Stone Matrix Asphalt', 'A gap-graded mixture designed around a stone-on-stone aggregate skeleton with a binder-rich mortar. Used for specialised performance requirements, and may involve stabilising additives.'],
    ['WMA', 'Warm Mix Asphalt', 'Produced with technologies that allow mixing and placement at reduced temperatures compared with conventional hot-mix processes: chemical additives, foaming or other approved methods. The specification and equipment determine the process.'],
    ['Modified', 'Modified bituminous mixes', 'Use an approved modified binder or additive system for specified performance, such as PMB or CRMB. The modification must be part of the approved mix design.'],
    ['RAP', 'Reclaimed Asphalt Pavement mixes', 'RAP is recovered from existing bituminous pavement. Where permitted, it is processed, characterised and incorporated into a new mix design. Its percentage, binder contribution and grading follow the approved design.']
  ];
  return sec('types', '', `
    ${head('types', 'Types of Hot Mix', 'Different mixes. Different pavement functions.', 'Hot Mix Asphalt is not one universal mixture. Different bituminous mixes are designed for different pavement layers, traffic conditions and construction requirements.')}
    <div class="hma-types">${T.map((t, i) => `<article class="hma-type" data-rv><span class="hma-type-n">${String(i + 1).padStart(2, '0')}</span><b class="hma-type-k">${t[0]}</b><h3 class="ap-h4">${t[1]}</h3><p>${t[2]}</p></article>`).join('')}</div>
    ${warn('<strong>The correct mix type must be selected from the contract specification.</strong> Open-graded premix carpet and other surface treatments are different materials and should not be confused with dense graded DBM or BC. Not every mix is suitable for every application.')}
    <div class="ap-cta-row"><a href="#pavement" class="btn btn-accent" data-ev="hot_mix_process_interaction" data-loc="types">Understand DBM vs BC <span class="btn-arrow" aria-hidden="true">→</span></a></div>`, { bone: true });
}

/* ============ DBM vs BC (reuses the site's real cut-block pavement scene) ============ */
function pavement() {
  const alt = 'A flexible-pavement cross-section as real cut blocks: laterite subgrade, pale granular sub-base, dark graded base, bituminous base and wearing course, pulled apart';
  const poster = n => `/img/applications/hot-mix-asphalt/s3d/hma-pavement-${n}.webp`;
  const widget = `<p class="s3d-banner" role="note">An example flexible-pavement arrangement <i>·</i> actual layers and thicknesses depend on the pavement design</p>
    <div class="s3d-box s3d-wide s3d-nums s3d-dots hma-pave" data-s3d="rdpave" data-init='{"set":"layers","view":"reveal","explode":0.6,"hotid":"dbm","pav":"flex"}'>
      <div class="s3d-grid">
        <figure class="s3d-fig"><div class="s3d-stage"><img class="s3d-poster" src="${poster(1000)}" srcset="${poster(640)} 640w, ${poster(1000)} 1000w" sizes="(max-width:1000px) 92vw, 60vw" width="1000" height="625" alt="${L.esc(alt)}" loading="lazy" decoding="async" /><canvas class="s3d-cv" tabindex="0" role="img" aria-label="${L.esc(alt)}. Drag to turn the view; use the arrow keys when focused."></canvas><div class="s3d-labels"></div><div class="s3d-tools"><button type="button" data-zoom="out" aria-label="Zoom out">−</button><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" class="rs" data-zoom="reset" aria-label="Reset the view">Reset</button></div><div class="s3d-hint" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>Drag to turn</div></div><figcaption>A flexible-pavement cross-section as real cut blocks, pulled apart. Choose DBM or BC to outline it. The arrangement is an example, not a pavement design.</figcaption></figure>
        <div class="s3d-ctl"><p class="s3d-lbl">Outline a layer</p><div class="s3d-seg" role="group" aria-label="Outline a layer"><button type="button" data-set="hotid:dbm" aria-pressed="true">DBM</button><button type="button" data-set="hotid:bc" aria-pressed="false">BC</button><button type="button" data-set="hotid:wmm" aria-pressed="false">Base course</button><button type="button" data-set="hotid:gsb" aria-pressed="false">Sub-base</button></div><div class="s3d-seg" role="group" aria-label="Layers"><button type="button" data-set="explode:0.6" aria-pressed="true">Separate the layers</button><button type="button" data-set="explode:0" aria-pressed="false">Close them up</button></div>
          <div class="s3d-read" aria-live="polite">
            <div data-when="hotid:dbm"><span class="tag">Layer 4 · binder / base course</span><h4>DBM: the structural bituminous layer</h4><p>Commonly sits beneath the wearing course and contributes the structural bituminous part of the flexible pavement. It is not the final surface.</p></div>
            <div data-when="hotid:bc"><span class="tag">Layer 5 · wearing course</span><h4>BC: the finished surface</h4><p>Commonly forms the upper layer: the riding surface that takes traffic and weather and protects the layers beneath.</p></div>
            <div data-when="hotid:wmm"><span class="tag">Layer 3 · base course</span><h4>Granular base: not a bituminous layer</h4><p>Wet Mix Macadam is a granular base course. It has no bituminous binder and is a different material from Hot Mix. <a class="ap-link" href="/applications/wet-mix-macadam/">WMM applications</a></p></div>
            <div data-when="hotid:gsb"><span class="tag">Layer 2 · sub-base</span><h4>GSB: the granular sub-base</h4><p>Graded granular material beneath the base, with no bituminous binder. <a class="ap-link" href="/applications/granular-sub-base/">GSB applications</a></p></div>
          </div>
          <p class="s3d-lbl" style="margin-top:20px">In the picture</p><ul class="s3d-legend s3d-key" aria-hidden="true"></ul>
        </div>
      </div>
    </div>
    <p class="ap-small">Layer thicknesses are not to scale and are not specification values. The picture shows no mix property or test result.</p>`;
  return sec('pavement', '', `
    ${head('pavement', 'DBM vs BC', 'Understanding the two major pavement layers.', 'DBM commonly provides the structural bituminous layer beneath the wearing course. BC commonly forms the upper wearing surface. Their actual function and specification depend on the pavement design.')}
    ${widget}
    <h3 class="ap-h3" style="margin-top:48px">DBM and BC compared</h3>
    ${tbl('DBM and BC compared', ['Parameter', 'DBM', 'BC'], [
      ['Full form', 'Dense Bituminous Macadam', 'Bituminous Concrete'], ['Typical pavement position', 'Binder / base course', 'Wearing course'],
      ['Main role', 'Structural bituminous layer', 'Finished surface layer'], ['Aggregate grading', 'As specified for DBM', 'As specified for BC'],
      ['Surface function', 'Supports the upper pavement layers', 'Provides the final riding surface'], ['Mix design', 'Project-specific', 'Project-specific'],
      ['Binder', 'Specified paving or modified binder', 'Specified paving or modified binder'], ['Construction', 'Hot mixing, laying and compaction', 'Hot mixing, laying and compaction']])}
    <div class="hma-pair" style="margin-top:36px">
      <div class="ap-prose" data-rv><h3 class="ap-h3">Where each is used</h3><p class="ap-label">DBM</p>${ul(['National and state highways and major roads.', 'Urban road construction and industrial access roads.', 'Infrastructure projects and specified pavement rehabilitation.'])}<p class="ap-label">BC</p>${ul(['Highway and state-road wearing courses.', 'Urban, industrial and commercial access roads.', 'Resurfacing and rehabilitation, where specified.'])}${warn('DBM is not the final wearing course; the surface course is selected and specified separately. BC is a specified mix type: its grading, binder and volumetric requirements follow the approved specification.')}</div>
      ${fig('asphalt-coarse-fine-texture-comparison', 'Two dense asphalt textures on a granular base', 'Two cut asphalt blocks side by side on a pale granular base, one with visibly coarser stone and one with a finer, denser texture, each with a magnified circle of its surface')}
    </div>
    ${ctaRow('pavement', 'spec')}`, { bone: true });
}

/* ============ binder ============ */
function binder() {
  const V = [['VG-10', 'A lower-viscosity paving grade, generally considered for relevant cooler-climate or specified applications.'], ['VG-20', 'A paving grade considered for specified climatic and pavement conditions.'], ['VG-30', 'A commonly used paving-grade binder for many road applications, subject to the project specification and climatic selection.'], ['VG-40', 'A higher-viscosity grade that may be selected for highly stressed pavement locations, subject to engineering design and specification.']];
  return sec('binder', '', `
    <div class="hma-pair hma-pair--rev">
      <div class="ap-prose" data-rv><p class="ap-kicker">Bitumen grades and binder selection</p><h2 class="ap-h2" id="binderTitle">Paving-grade bitumen is chosen for the road, not for the name of the mix.</h2><p class="ap-lede">In India, IS 73:2013 specifies viscosity-graded paving bitumen.</p>${p('The commonly referenced grades are VG-10, VG-20, VG-30 and VG-40. Selection depends on climatic and project conditions, not simply on the mix name.')}</div>
      ${fig('asphalt-bitumen-binder-laboratory-test', 'Binder testing in a laboratory', 'A technician in a laboratory beside a penetration test apparatus and a softening point test apparatus testing bitumen')}
    </div>
    <div class="hma-vg">${V.map(v => `<article class="hma-vg-c" data-rv><b>${v[0]}</b><p>${v[1]}</p></article>`).join('')}</div>
    <div class="ap-prose wmd-flow" style="margin-top:30px">
      ${card('A higher VG number is not automatically better', '<p>Selection must consider:</p>' + ul(['High pavement temperatures.', 'Low pavement temperatures.', 'Traffic and loading.', 'Mix design and construction conditions.', 'The applicable specification.']))}
      ${card('What IS 73:2013 checks', '<p>The standard classifies paving bitumen by viscosity at 60°C and includes requirements such as:</p>' + ul(['Absolute and kinematic viscosity.', 'Flash point and solubility.', 'Penetration and softening point.', 'Tests on aged binder residue.']) + '<p class="ap-small">Check the current standard and amendments for the actual limits.</p>')}
    </div>
    ${warn('<strong>Selection note.</strong> The binder grade shown on this page is for technical explanation. The actual grade used in a project must be specified by the Engineer or approved mix design and must comply with the governing contract.')}`);
}

/* ============ aggregate grading + gradation tool ============ */
const SIEVES = ['37.5', '26.5', '19', '13.2', '9.5', '4.75', '2.36', '1.18', '0.6', '0.3', '0.15', '0.075'];
function grading() {
  const rows = SIEVES.map(s => `<tr><th scope="row">${s}</th><td data-label="Lower limit %"><input inputmode="decimal" data-gr="lo" data-s="${s}" aria-label="Lower specified limit at ${s} mm" placeholder="–" autocomplete="off" /></td><td data-label="Upper limit %"><input inputmode="decimal" data-gr="hi" data-s="${s}" aria-label="Upper specified limit at ${s} mm" placeholder="–" autocomplete="off" /></td><td data-label="Combined grading %"><input inputmode="decimal" data-gr="mid" data-s="${s}" aria-label="Combined grading at ${s} mm" placeholder="–" autocomplete="off" /></td></tr>`).join('');
  return sec('grading', '', `
    ${head('grading', 'Aggregate grading', 'Grading decides how the stone packs.', 'Aggregate grading describes how the mineral particles are distributed across sizes. A well-designed grading is needed for the required aggregate skeleton, density, stability, workability, air-void structure, durability and resistance to deformation.')}
    ${grid([
      card('Coarse fraction', '<p>The larger particles that carry the mineral skeleton.</p>'), card('Intermediate fraction', '<p>Completes the grading and contributes to the packing arrangement.</p>'),
      card('Fine fraction', '<p>Fills the smaller spaces between the larger particles.</p>'), card('Mineral filler', '<p>The finest mineral component, which interacts with the binder.</p>')])}
    <div class="ap-prose" data-rv style="margin-top:28px"><p>The grading is shown as a curve of <strong>percentage passing</strong> against <strong>sieve size</strong>. The approved mix design identifies the required grading, with an upper and a lower specified limit.</p></div>
    <h3 class="ap-h3" style="margin-top:36px" id="gradeToolTitle">Interactive 05 · Gradation chart: plot your own grading</h3>
    <div class="ap-prose" data-rv><p>Enter the specified limits and the combined grading from your own approved mix design or laboratory report, as percentage passing for each sieve. The chart is drawn in your browser from your numbers; nothing is stored or sent, and <strong>no limit or curve is built in</strong>, so nothing here can be mistaken for a specification or for OM GROUP production data.</p></div>
    <div class="s3d-box ex-box hma-grade hma-tool" id="hmaGrade">
      <div class="hma-tool-grid">
        <div class="hma-tool-chart"><svg id="hmaGradeSvg" viewBox="0 0 640 550" role="img" aria-label="Gradation chart: percentage passing against sieve size on a logarithmic scale. It stays empty until you enter your own values."></svg>
          <ul class="hma-key" aria-hidden="true"><li><i class="k dash"></i>Your limits</li><li><i class="k band"></i>Between your limits</li><li><i class="k mid"></i>Your combined grading</li></ul>
          <p class="ap-small hma-msg" id="hmaGradeMsg" aria-live="polite">The chart is empty until you enter values.</p></div>
        <div class="hma-tool-form"><table class="hma-tbl"><caption>Enter % passing for each IS sieve (mm)</caption><thead><tr><th scope="col">Sieve, mm</th><th scope="col">Lower limit %</th><th scope="col">Upper limit %</th><th scope="col">Combined grading %</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="hma-tool-foot"><button type="button" class="btn btn-ghost" id="hmaGradeClear">Clear all values</button></div></div>
      </div>
    </div>
    ${small('The sieve series (37.5 mm to 0.075 mm) is the IS sieve series used in bituminous mix specifications. Use only the limits that your contract table gives for your mix type.')}`, { bone: true });
}

/* ============ JMF, Marshall, volumetrics ============ */
function jmf() {
  const marshall = ['Material selection', 'Aggregate grading', 'Binder selection', 'Specimen preparation', 'Laboratory compaction', 'Bulk specific gravity', 'Maximum theoretical specific gravity', 'Air-void calculation', 'VMA calculation', 'VFB calculation', 'Marshall stability', 'Marshall flow', 'Selection of optimum binder content', 'Verification against design criteria'];
  return sec('jmf', '', `
    ${head('jmf', 'Mix design', 'The Job Mix Formula defines the mixture.', 'The Job Mix Formula (JMF) is the approved mix design that defines the material proportions and production requirements for the specified mixture.')}
    <div class="hma-pair hma-pair--top">
      <div class="ap-prose" data-rv><p class="ap-label">It establishes</p>${ul(['Aggregate fractions and grading.', 'Binder type and binder content.', 'Mineral filler and additives, where applicable.', 'Relevant mix properties.'])}</div>
      <div class="ap-prose" data-rv><h3 class="ap-h3">Why it matters</h3>${p('Without an approved mix design the producer has no properly established recipe for the specified material. The JMF is the reference for production control: it helps control proportions, consistency, binder content, grading and quality acceptance.')}</div>
    </div>
    ${R3.jmfFig()}
    <div class="hma-pair hma-pair--rev hma-pair--top" style="margin-top:40px">
      <div class="ap-prose" data-rv><h3 class="ap-h3">Optimum binder content</h3>${p('Optimum binder content is the proportion chosen through the specified mix-design procedure to meet the volumetric and performance requirements. It is not chosen by how the mix looks.')}<p class="ap-label">Too little binder can lead to</p>${ul(['Poor coating and reduced durability.', 'Ravelling and moisture-related damage.'])}<p class="ap-label">Too much binder can contribute to</p>${ul(['Bleeding and reduced air voids.', 'Reduced stability, and rutting or deformation risk.'])}</div>
      <div class="ap-prose" data-rv><h3 class="ap-h3">Marshall Mix Design</h3>${p('A recognised method for designing and evaluating specified bituminous mixes. Specimens are prepared at different binder contents and their properties evaluated. IRC:SP:135-2022 gives guidance on hot bituminous mix design, including Marshall design and volumetric properties.')}<ol class="hma-ol">${marshall.map(m => `<li>${m}</li>`).join('')}</ol></div>
    </div>
    <h3 class="ap-h3" style="margin-top:44px">Important mix-design properties</h3>
    ${tbl('Mix-design properties explained', ['Property', 'What it tells the engineer'], [
      ['Air voids', 'The volume of air spaces within the compacted mixture; important for performance and durability'],
      ['VMA, voids in mineral aggregate', 'The void space between aggregate particles in the compacted mixture, including air voids and effective binder volume'],
      ['VFB, voids filled with bitumen', 'The proportion of the VMA occupied by effective bitumen'],
      ['Marshall stability', 'The maximum load a prepared specimen supports under the prescribed test method'],
      ['Marshall flow', 'The deformation associated with the stability test'],
      ['Bulk specific gravity', 'Used in calculating the volumetric properties of the compacted mixture'],
      ['Maximum theoretical specific gravity', 'The theoretical density of the mix without air voids']])}
    ${warn('<strong>No universal acceptance limits are shown.</strong> They depend on the mix type, traffic category, design method and tender conditions. Use the applicable specification.')}
    ${ctaRow('jmf', 'tech')}`, { bone: true });
}

module.exports = { quick, answers, product, ingredients, types, pavement, binder, grading, jmf, SIEVES };
