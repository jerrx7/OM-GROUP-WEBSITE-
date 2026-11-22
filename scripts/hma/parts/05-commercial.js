const L = require('../lib');
const { pic, fig, sec, head, p, ul, card, grid, warn, small, ans, tbl, ex, ctaRow, cta, MSG, esc, enc } = L;

/* ============ applications ============ */
function applications() {
  const A = [
    ['National highways', 'Specified bituminous layers for high-volume highway pavement construction.'], ['State highways', 'Bituminous base, binder and wearing courses for state road networks.'],
    ['District roads', 'Road surfacing and structural bituminous layers according to the project specification.'], ['Urban roads', 'Municipal roads, arterial roads and selected urban resurfacing projects.'],
    ['Rural roads', 'Specified bituminous surfacing and pavement construction.'], ['Industrial roads', 'Roads within industrial estates, manufacturing facilities and commercial premises.'],
    ['Warehouse and logistics access roads', 'Pavement designed for the expected heavy-vehicle traffic.'], ['Commercial developments', 'Internal roads, approach roads and circulation areas.'],
    ['Residential developments', 'Internal access roads and selected paved areas.'], ['Airport pavements', 'Specialised airfield bituminous pavements where the approved design and specifications require them. <strong>Ordinary road Hot Mix does not automatically satisfy airfield requirements.</strong>'],
    ['Road widening', 'Additional pavement construction and integration with the existing road.'], ['Road resurfacing', 'New bituminous surface placement over a suitably prepared existing pavement.'],
    ['Pavement rehabilitation', 'Specified bituminous layers used as part of a rehabilitation design.'], ['Bridge approaches', 'Bituminous pavement used in specified approach-road arrangements.'],
    ['Junctions and intersections', 'Specified mixes selected to address turning, braking and traffic stresses.'], ['Parking and truck movement areas', 'Bituminous surfaces for selected commercial and industrial parking applications.'],
    ['Pothole and localised repair works', 'Approved hot mix materials used in suitable repair operations, subject to the contract and repair method.']];
  return sec('applications', '', `
    ${head('applications', 'Where Hot Mix is used', 'Hot Mix for roads and infrastructure.', 'Hot Mix Asphalt is used in a wide range of bituminous pavement applications, depending on the specified mix type and the pavement design. Each application below states a typical use; the selected mix must match the project design.')}
    <div class="hma-trio">${fig('finished-asphalt-highway', 'Highways', 'A completed asphalt highway with lane markings')}${fig('urban-asphalt-road-construction', 'Urban roads', 'A paver and rollers laying asphalt on an urban road')}${fig('industrial-asphalt-access-road', 'Industrial and logistics roads', 'A freshly surfaced road past a large industrial building with trucks')}</div>
    <ul class="hma-apps">${A.map((a, i) => `<li data-rv><b>${String(i + 1).padStart(2, '0')}</b><h3 class="ap-h4">${a[0]}</h3><p>${a[1]}</p></li>`).join('')}</ul>
    ${warn('<strong>Not every Hot Mix is suitable for every application.</strong> The project designer determines the mix type, binder, aggregate grading, thickness, traffic category, surface characteristics and construction requirements.')}
    ${ctaRow('applications', 'req')}`, { bone: true });
}

/* ============ comparisons ============ */
function compare() {
  return sec('compare', '', `
    ${head('compare', 'Hot Mix compared with other materials', 'Different binders. Different layers. Not interchangeable.', '')}
    <div class="hma-cmp2">
    <div class="hma-cmp2-b"><h3 class="ap-h3">Hot Mix Asphalt and WMM</h3>
    ${tbl('Hot Mix Asphalt and WMM compared', ['Parameter', 'Hot Mix Asphalt', 'WMM'], [['Full form', 'Hot Mix Asphalt', 'Wet Mix Macadam'], ['Main ingredients', 'Aggregates, filler and bitumen', 'Graded aggregates and water'], ['Binder', 'Bituminous binder', 'No bituminous binder in the standard WMM layer'], ['Function', 'Bituminous pavement layer', 'Granular base course'], ['Production', 'Hot mixing', 'Wet mixing'], ['Placement', 'Asphalt paver or specified method', 'WMM paver or approved construction method'], ['Compaction', 'Specified asphalt rolling process', 'Specified granular compaction process']])}
    ${small('WMM is a granular road base material. Hot Mix Asphalt is a bituminous pavement material. They perform different functions. DBM is a dense bituminous mix; WMM is a granular base course; they occupy different positions and are not interchangeable. <a class="ap-link" href="/applications/wet-mix-macadam/">WMM applications</a> · <a class="ap-link" href="/products/wmm">WMM aggregate</a>')}</div>
    <div class="hma-cmp2-b"><h3 class="ap-h3">Hot Mix Asphalt and GSB</h3>
    ${tbl('Hot Mix Asphalt and GSB compared', ['Parameter', 'Hot Mix Asphalt', 'GSB'], [['Full form', 'Hot Mix Asphalt', 'Granular Sub-Base'], ['Composition', 'Aggregate, filler and bitumen', 'Graded granular material'], ['Main function', 'Bituminous pavement layer', 'Sub-base support, with drainage and separation functions where designed'], ['Binder', 'Bitumen', 'No bituminous binder in ordinary GSB'], ['Position', 'Upper bituminous portion of the pavement', 'Beneath the base and upper pavement layers']])}
    ${small('<a class="ap-link" href="/applications/granular-sub-base/">GSB applications</a> · <a class="ap-link" href="/products/granular-sub-base">GSB product</a>')}</div>
    <div class="hma-cmp2-b"><h3 class="ap-h3">Hot Mix Asphalt and RMC</h3>
    ${tbl('Hot Mix Asphalt and RMC compared', ['Parameter', 'Hot Mix Asphalt', 'RMC'], [['Full form', 'Hot Mix Asphalt', 'Ready-Mix Concrete'], ['Main binder', 'Bitumen', 'Cementitious binder'], ['Aggregate', 'Mineral aggregate', 'Fine and coarse aggregate'], ['Production', 'Hot mixing', 'Controlled concrete batching and mixing'], ['Typical application', 'Flexible pavement', 'Concrete structures and rigid pavements'], ['Placement', 'Asphalt paver or specified process', 'Concrete placing equipment'], ['Finishing', 'Roller compaction', 'Concrete finishing and curing']])}
    ${small('HMA uses bitumen as the binder. RMC uses cementitious binder and water. They are entirely different construction materials. <a class="ap-link" href="/products/ready-mix-concrete">Ready-Mix Concrete</a>')}</div>
    <div class="hma-cmp2-b"><h3 class="ap-h3">Hot Mix and Cold Mix</h3>
    ${tbl('Hot Mix and Cold Mix compared', ['Parameter', 'Hot Mix', 'Cold Mix'], [['Production', 'Heated materials and hot mixing', 'Produced using specified emulsion or cutback-based processes'], ['Application', 'Hot pavement construction', 'Selected repair and construction applications'], ['Temperature', 'Controlled hot-mix conditions', 'Generally lower-temperature handling'], ['Compaction', 'Specified hot-mix rolling process', 'Method depends on the cold-mix product'], ['Typical use', 'Main bituminous pavement works', 'Selected maintenance and repair works']])}
    ${small('Cold Mix is not simply Hot Mix that has cooled. It uses a different material system and construction approach.')}</div>
    </div>`);
}

/* ============ standards + specification ============ */
function standards() {
  const S = [
    ['MoRTH Specifications for Road and Bridge Works, Fifth Revision (2013)', 'The established Section 500 framework for bituminous pavement construction: general requirements, materials, prime coat, tack coat, Bituminous Macadam, Dense Bituminous Macadam, Bituminous Concrete, construction and quality control. The clause and table must be matched to the mix type and contract.'],
    ['MoRTH Sixth Revision (October 2026)', 'MoRTH Circular No. 407.29 dated 29 October 2026 announces it, effective for National Highway works from 1 January 2027. It includes updated materials, mixes and methods, including Warm Mix Asphalt, bituminous mixes with waste plastic, gap-graded wearing course with rubberised bitumen and high-performance bituminous mixes. For National Highway tenders received after 1 January 2027 the Sixth Revision is to be included in the bid documents, so Fifth Revision values must not be presented as universal current requirements for those contracts.'],
    ['IRC:90-2010', 'Guidelines for Selection, Operation and Maintenance of Bituminous Hot Mix Plant: batch plants, drum-mix plants, capacity, cold feed, dryer, screening, hot bins, weighing, bitumen system, pugmill, dust collection, controls, operation and maintenance.'],
    ['IRC:SP:135-2022', 'Manual for the Design of Hot Bituminous Mixes: mix selection, aggregate properties, binder selection, Marshall mix design, volumetric properties, optimum binder content, RAP mix design and Superpave-related guidance.'],
    ['IS 73:2013', 'Paving Bitumen: Specification. Viscosity-graded paving bitumen.'],
    ['IS 8887', 'Bitumen emulsion, for specified applications including prime and tack coats where the contract applies it.'],
    ['IS 1201 to IS 1220 series', 'Methods for testing tar and bituminous materials.'],
    ['Goa PWD circular, 15 May 2026', 'Special conditions for hot mix plants in specified bituminous road works in Goa: plant type, capacity, location, availability, pollution-control certification, field laboratory and quality-control supervision.']];
  const spec = [['Mix type', 'DBM, BC or another specified bituminous mixture'], ['Aggregate source', 'Approved source of mineral aggregate'], ['Aggregate grading', 'Combined particle-size distribution'], ['Coarse aggregate properties', 'Strength, shape, abrasion and durability requirements'], ['Fine aggregate properties', 'Grading, cleanliness and suitability'], ['Mineral filler', 'Type and specified characteristics'], ['Binder type', 'Paving-grade or modified binder'], ['Binder grade', 'VG grade or specified modified binder'], ['Binder content', 'Approved percentage by mass of mixture'], ['Job Mix Formula', 'Approved mix proportions and design parameters'], ['Air voids', 'Air volume within the compacted mixture'], ['VMA', 'Voids in mineral aggregate'], ['VFB', 'Voids filled with bitumen'], ['Marshall properties', 'Where applicable to the approved design'], ['Mixing temperature', 'Specified production condition'], ['Laying temperature', 'Specified paving condition'], ['Compaction', 'Required rolling and density criteria'], ['Layer thickness', 'Specified compacted thickness'], ['Field density', 'Required acceptance measurement'], ['Sampling', 'Specified sampling frequency'], ['Testing', 'Required laboratory and field tests']];
  return sec('standards', '', `
    ${head('standards', 'Standards and engineering references', 'Use the standard that governs your contract.', 'These standards are references for understanding Hot Mix Asphalt. They are not all applicable to every order.')}
    <div class="hma-std">${S.map(s => `<article class="hma-std-c" data-rv><h3 class="ap-h4">${s[0]}</h3><p>${s[1]}</p></article>`).join('')}</div>
    ${warn('<strong>Required standards note.</strong> The applicable technical requirements depend on the project specification, tender, approved Job Mix Formula, applicable MoRTH revision, IRC guidance, BIS standards and Engineer\'s instructions. The standards listed here are references for understanding Hot Mix Asphalt and are not a substitute for the governing contract.')}
    <h3 class="ap-h3" id="specTitle" style="margin-top:48px">What a Hot Mix specification contains</h3>
    <div class="ap-prose" data-rv><p>A professional Hot Mix specification explains the parameters that define the supplied mixture. This table says what each one means; it deliberately shows no figures.</p></div>
    <div class="hma-spec2">${tbl('Hot Mix specification parameters', ['Specification parameter', 'What it means'], spec.slice(0, Math.ceil(spec.length / 2)))}${tbl('Hot Mix specification parameters, continued', ['Specification parameter', 'What it means'], spec.slice(Math.ceil(spec.length / 2)))}</div>
    ${small('<strong>No generic figures are shown</strong> for binder content, air voids, VMA, VFB, Marshall stability or flow, aggregate abrasion or impact, layer thickness, production temperature, compaction temperature or density. They vary with mix type, design and contract, and are displayed only from an approved mix design or test report.')}`, { bone: true });
}

/* ============ quantity calculator + pricing ============ */
function quantity() {
  return sec('quantity', '', `
    ${head('quantity', 'Interactive 09 · Quantity calculator', 'How much Hot Mix does a road need?', 'Hot Mix is generally ordered and measured by mass, subject to the contract and commercial agreement. For a uniform rectangular pavement area the theoretical compacted volume is length × width × compacted thickness, and the theoretical compacted mass is that volume × the approved compacted density.')}
    <div class="hma-pair hma-pair--rev hma-pair--top">
      <form class="s3d-box ex-box hma-calc" id="hmaCalc" novalidate onsubmit="return false">
        <div class="hma-calc-g">
          <label>Road length, m<input data-q="len" inputmode="decimal" placeholder="e.g. your length" autocomplete="off" /></label>
          <label>Road width, m<input data-q="wid" inputmode="decimal" placeholder="e.g. your width" autocomplete="off" /></label>
          <label>Compacted thickness, mm<input data-q="thk" inputmode="decimal" placeholder="e.g. your thickness" autocomplete="off" /></label>
          <label>Approved compacted density, t/m³<input data-q="den" inputmode="decimal" placeholder="from your approved mix" autocomplete="off" /></label>
        </div>
        <div class="hma-calc-out" aria-live="polite"><div><span>Compacted volume</span><b id="hmaVol">—</b></div><div><span>Theoretical mass</span><b id="hmaMass">—</b></div></div>
        <p class="ap-small" id="hmaCalcMsg">Enter the four values. The density must come from your approved mix design; none is assumed.</p>
        <div class="ap-cta-row"><button type="button" class="btn btn-ghost" id="hmaCalcEx">Try the worked example</button><button type="button" class="btn btn-ghost" id="hmaCalcClear">Clear</button></div>
      </form>
      <div class="ap-prose" data-rv><h3 class="ap-h3">Worked example</h3><p>Road length 1,000 m, width 7 m, compacted thickness 50 mm (0.05 m).</p><p><code class="hma-code">1,000 × 7 × 0.05 = 350 m³</code></p><p>With an illustrative density of 2.40 tonnes/m³:</p><p><code class="hma-code">350 × 2.40 = 840 tonnes</code></p><p class="hma-badge">Illustrative calculation only</p><p class="ap-small">This is not an OM GROUP production density or a recommended density for any mix. Final procurement and payment quantities must follow the approved mix density, the BOQ and the applicable measurement method.</p></div>
    </div>
    <h3 class="ap-h3" style="margin-top:44px" id="pricingTitle">What affects Hot Mix pricing?</h3>
    <div class="ap-prose" data-rv><p>Hot Mix is not assigned one fixed universal price. A quotation is prepared against the specified mix type, quantity, delivery location and current commercial conditions. No price is shown on this page.</p></div>
    ${grid([card('Material factors', ul(['Aggregate cost and grading.', 'Binder grade and price.', 'Mineral filler, additives or modifiers.', 'Mix type and JMF requirements.'])), card('Manufacturing factors', ul(['Plant type and production requirements.', 'Fuel and electricity.', 'Plant operating costs.', 'Quality control and production quantity.'])), card('Logistics factors', ul(['Plant and project location, transport distance.', 'Truck availability and travel time.', 'Loading and unloading.', 'Delivery schedule and site access.'])), card('Project factors', ul(['Quantity and mix specification.', 'Testing requirements and contract conditions.', 'Phased delivery and site restrictions.', 'Current material prices.']))])}`);
}

/* ============ why OM GROUP (State B) ============ */
function whyOm() {
  return sec('why-om', '', `
    <p class="ap-kicker">Why OM GROUP</p>
    <h2 class="ap-h2" id="why-omTitle">Supporting road construction through connected material supply.</h2>
    <div class="ap-prose"><p class="ap-lede">A road project rarely uses one material. OM GROUP's existing road-material portfolio covers the granular layers beneath the asphalt and the aggregates that go into it.</p></div>
    <div class="ap-whys">
      <div class="ap-why" data-rv><h3><span>01</span>Crushed aggregates</h3><div><p>OM GROUP manufactures and supplies crushed stone aggregate from its own VSI crushing facility at Banda Wafoli: 6mm, 10mm, 12.5mm, 20mm, 40mm and 60mm fractions.</p></div></div>
      <div class="ap-why" data-rv><h3><span>02</span>GSB and WMM</h3><div><p>The Granular Sub-Base and Wet Mix Macadam aggregate used in the layers beneath a bituminous pavement.</p></div></div>
      <div class="ap-why" data-rv><h3><span>03</span>Boulders, sands and RMC</h3><div><p>Construction boulders, M-Sand, river and washed sand and ready-mix concrete for associated civil works.</p></div></div>
      <div class="ap-why" data-rv><h3><span>04</span>Transport and logistics</h3><div><p>OM GROUP operates a transport fleet, and supply is coordinated across North Goa and South Goa.</p></div></div>
    </div>
    ${warn('<strong>This page does not state that OM GROUP manufactures or supplies Hot Mix Asphalt.</strong> It makes no claim about a plant, plant type, capacity, mix types, binder grade, laboratory, certification, delivery fleet or supply coverage for Hot Mix. If you need Hot Mix for a project, share the requirement; availability and supply arrangements are confirmed against it.')}
    <ul class="ap-rel hma-rel" data-rv>
      <li><a href="/products/granular-sub-base" data-ev="hot_mix_gsb_click" data-loc="why_om"><span class="stg"><picture><source type="image/avif" srcset="/img/products/showcase/granular-sub-base-560.avif" /><img src="/img/products/showcase/granular-sub-base-560.webp" width="560" height="342" alt="" loading="lazy" decoding="async" style="--w:98%" /></picture></span><span class="nm">GSB</span><small>Granular Sub-Base</small></a></li>
      <li><a href="/products/wmm" data-ev="hot_mix_wmm_click" data-loc="why_om"><span class="stg"><picture><source type="image/avif" srcset="/img/products/showcase/wmm-560.avif" /><img src="/img/products/showcase/wmm-560.webp" width="560" height="361" alt="" loading="lazy" decoding="async" style="--w:98%" /></picture></span><span class="nm">WMM</span><small>Wet Mix Macadam aggregate</small></a></li>
      <li><a href="/products/20mm-aggregate" data-ev="hot_mix_20mm_click" data-loc="why_om"><span class="stg"><picture><source type="image/avif" srcset="/img/products/showcase/20mm-aggregate-560.avif" /><img src="/img/products/showcase/20mm-aggregate-560.webp" width="560" height="501" alt="" loading="lazy" decoding="async" style="--w:80%" /></picture></span><span class="nm">20mm</span><small>Crushed aggregate</small></a></li>
      <li><a href="/products/10mm-aggregate" data-ev="hot_mix_10mm_click" data-loc="why_om"><span class="stg"><picture><source type="image/avif" srcset="/img/products/showcase/10mm-aggregate-560.avif" /><img src="/img/products/showcase/10mm-aggregate-560.webp" width="560" height="510" alt="" loading="lazy" decoding="async" style="--w:78%" /></picture></span><span class="nm">10mm</span><small>Crushed aggregate</small></a></li>
      <li><a href="/products/6mm-aggregate" data-ev="hot_mix_6mm_click" data-loc="why_om"><span class="stg"><picture><source type="image/avif" srcset="/img/products/showcase/6mm-aggregate-560.avif" /><img src="/img/products/showcase/6mm-aggregate-560.webp" width="560" height="501" alt="" loading="lazy" decoding="async" style="--w:79%" /></picture></span><span class="nm">6mm</span><small>Fine fraction</small></a></li>
    </ul>`, { bone: true });
}

/* ============ how to enquire + builder ============ */
function order() {
  const steps = [['Identify the required mix', 'DBM, BC, BM, SDBC or another approved mix.'], ['Share the project specification', 'The governing MoRTH or other specification, tender reference, grading, binder grade and approved JMF.'], ['Confirm the quantity', 'Total quantity, delivery unit, road dimensions, layer thickness and delivery schedule.'], ['Confirm the project location', 'Site address, access, delivery restrictions and distance from the plant.'], ['Confirm delivery and paving', 'Vehicle requirement, delivery windows, paver availability, site readiness and unloading.'], ['Confirm quality documentation', 'Where required: JMF, binder certificate, aggregate test results, production and temperature records, mix test results and delivery challan.'], ['Request a response', 'The supplier confirms availability, mix specification, quantity, rate, transport, schedule and documentation.']];
  const sel = (k, label, opts) => `<label>${label}<select data-b="${k}"><option value="">${opts[0]}</option>${opts.slice(1).map(o => `<option>${o}</option>`).join('')}</select></label>`;
  const inp = (k, label, ph, mode) => `<label>${label}<input data-b="${k}" ${mode ? `inputmode="${mode}" ` : ''}placeholder="${ph}" autocomplete="off" /></label>`;
  return sec('order', '', `
    ${head('order', 'How to enquire about Hot Mix', 'Share the mix, the specification, the quantity and the location.', 'A proper Hot Mix enquiry gives the people who prepare a response what they need.')}
    <ol class="hma-steps" data-rv>${steps.map((s, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><div><h3 class="ap-h4">${s[0]}</h3><p>${s[1]}</p></div></li>`).join('')}</ol>
    <h3 class="ap-h3" style="margin-top:50px" id="builderTitle">Hot Mix enquiry builder</h3>
    <div class="ap-prose"><p>Fill in what you know. The builder writes your answers into the message of the standard OM GROUP enquiry form. It runs in your browser and sends nothing until you open the form, and <strong>it is a procurement aid, not a mix-design tool</strong>. Leave blank anything you do not know. Share the approved JMF or BOQ with the team afterwards.</p></div>
    <form class="s3d-box ex-box hma-build" id="hmaBuild" novalidate onsubmit="return false">
      <div class="csd-build-grid">
        ${sel('mix', 'Mix type', ['Choose', 'DBM', 'BC', 'BM', 'SDBC', 'SMA', 'Warm Mix Asphalt', 'Modified Bituminous Mix', 'Other / Need Technical Assistance'])}
        ${sel('ptype', 'Project type', ['Choose', 'National Highway', 'State Highway', 'District or rural road', 'Urban road', 'Industrial or logistics road', 'Commercial or residential development', 'Resurfacing or rehabilitation', 'Other'])}
        ${inp('spec', 'Applicable specification', 'e.g. MoRTH revision or tender reference')}
        ${sel('rev', 'MoRTH revision', ['Not sure yet', 'Fifth Revision (2013)', 'Sixth Revision (October 2026)', 'Not applicable'])}
        ${sel('jmf', 'JMF available?', ['Not sure yet', 'Yes', 'No', 'In progress'])}
        ${inp('bg', 'Binder grade', 'e.g. as in your approved mix (optional)')}
        ${inp('qty', 'Quantity, tonnes', 'Quantity (tonnes)', 'decimal')}
        ${inp('loc', 'Delivery location', 'Town or area')}
        ${inp('date', 'Delivery date', 'e.g. month or date')}
        ${sel('sched', 'Delivery schedule', ['To be confirmed', 'One-time', 'Phased'])}
        ${inp('len', 'Road length, m', 'optional', 'decimal')}${inp('wid', 'Road width, m', 'optional', 'decimal')}${inp('thk', 'Layer thickness, mm', 'optional', 'decimal')}
        ${sel('pave', 'Paving arrangement', ['To be confirmed', 'Paver and rollers arranged by the contractor', 'Paving support needed'])}
        ${sel('docs', 'Documentation needed', ['None yet', 'JMF', 'Binder certificate', 'Test documentation', 'JMF and test documentation'])}
      </div>
      <p class="ap-small csd-build-sum" id="hmaSum" aria-live="polite">Your message will read: “Hot Mix Asphalt enquiry.”</p>
      <p class="ap-small">Availability and supply conditions are confirmed against your requirement. The standard enquiry form opens and you complete and send it there.</p>
      <div class="ap-cta-row"><a id="hmaGo" href="${L.FORM}${enc(MSG.req)}#contact" class="btn btn-accent" data-ev="hot_mix_quote_click" data-loc="builder">Open the enquiry form with these details <span class="btn-arrow" aria-hidden="true">→</span></a></div>
    </form>
    ${ctaRow('order', 'req', 'spec', 'tech')}`);
}

/* ============ FAQ: the 60 search-intent questions ============ */
const FAQ = [
  ['Definition and ingredients', [
    ['What is Hot Mix Asphalt?', 'A bituminous pavement mixture produced by combining selected mineral aggregates, mineral filler and bituminous binder in controlled proportions. The materials are heated and mixed, transported, laid and compacted to form a pavement layer.'],
    ['What is Hot Mix used for?', 'Specified bituminous pavement layers in road and infrastructure construction: highways, state and urban roads, industrial roads, resurfacing, widening and rehabilitation.'],
    ['What does HMA stand for?', 'Hot Mix Asphalt.'],
    ['What is the difference between bitumen and asphalt?', 'Bitumen is the petroleum-derived binder. An asphalt mixture is mineral aggregate plus bituminous binder. When a contractor orders Hot Mix they order a specified mixture, not pure bitumen.'],
    ['What are the ingredients of Hot Mix?', 'Coarse aggregate, fine aggregate, mineral filler and bituminous binder, with approved additives or modifiers where specified.'],
    ['What is the function of aggregate in asphalt?', 'It forms the mineral skeleton: aggregate interlock, load distribution, stability and resistance to deformation.'],
    ['What is the function of bitumen?', 'It coats the aggregate particles and binds them into a cohesive mixture.'],
    ['What is mineral filler?', 'Very fine mineral material that forms the finest part of the aggregate system and interacts with the bitumen. Its type and quantity follow the approved mix design.'],
    ['What is the difference between coarse and fine aggregate?', 'Coarse aggregate forms the larger-particle skeleton. Fine aggregate completes the grading and fills the smaller spaces between larger particles.'],
    ['How is Hot Mix Asphalt manufactured?', 'Aggregate fractions are proportioned, dried and heated, binder and filler are added, the materials are mixed, the finished mix is inspected and discharged for transport. Batch and drum-mix plants do this differently.']]],
  ['Mix types', [
    ['What is DBM?', 'Dense Bituminous Macadam: a dense graded bituminous mix commonly used as a binder or base course in flexible pavements.'],
    ['What is BC?', 'Bituminous Concrete: a dense graded bituminous mix commonly used as the wearing course.'],
    ['What is the difference between DBM and BC?', 'DBM commonly sits beneath the wearing course as a structural bituminous layer; BC commonly forms the top surface. Specifications depend on the project design.'],
    ['What is Bituminous Macadam?', 'A bituminous road construction material used in specified applications. It differs from DBM in grading and structural role, and the two names are not interchangeable.'],
    ['What is SDBC?', 'Semi-Dense Bituminous Concrete: a semi-dense graded mix used in specified surfacing applications, depending on the governing specification.'],
    ['What is Stone Matrix Asphalt?', 'A gap-graded mix built around a stone-on-stone aggregate skeleton with a binder-rich mortar, used for specialised performance requirements.'],
    ['What is Warm Mix Asphalt?', 'An asphalt produced with technologies that allow mixing and placement at lower temperatures than conventional hot mix.'],
    ['What is modified bitumen?', 'Bitumen whose properties are changed with an approved modifier to achieve specified performance. The modification must be part of the approved mix design.'],
    ['What is polymer-modified bitumen?', 'Bitumen modified with a polymer (PMB), used where the specification or approved design calls for it.'],
    ['What is the difference between a binder course and a wearing course?', 'The wearing course is the top surface layer that takes traffic and weather. The binder course sits beneath it as part of the structural bituminous layers.']]],
  ['Manufacturing', [
    ['What is a Hot Mix Plant?', 'An industrial system that receives and proportions aggregate, dries and heats it, manages dust, heats and doses bitumen, adds filler, mixes and discharges the finished Hot Mix.'],
    ['How does a batch-type hot mix plant work?', 'It makes the mix in individual measured batches: cold feed, drying, hot elevator, screening, hot bins, weighing, bitumen dosing and pugmill mixing.'],
    ['How does a drum-mix plant work?', 'It makes the mix continuously: controlled aggregate feed into a rotating dryer-mixer, where the aggregate is dried and heated and binder and filler are added at designated points.'],
    ['What is the difference between batch and drum plants?', 'Batch plants weigh and mix batch by batch, with hot screens and hot bins. Conventional drum-mix plants produce continuously and do not use the same hot-bin arrangement.'],
    ['What is a rotary dryer?', 'A rotating drum with a controlled burner and internal lifting flights that cascade the aggregate through hot gases to dry and heat it.'],
    ['Why are aggregates heated?', 'To remove moisture and bring the aggregate to the production condition so that it can be coated properly with bitumen.'],
    ['What is a baghouse filter?', 'A dust collector in which filter bags capture the fine particles in the dryer exhaust. It supports environmental control but does not by itself make a plant pollution-free.'],
    ['What are hot bins?', 'Insulated bins in a batch plant that store the screened, heated aggregate fractions separately until they are weighed.'],
    ['What is a pugmill mixer?', 'A mixer with twin shafts and paddles in which weighed aggregate, binder and filler are combined until the particles are coated.'],
    ['How is bitumen added to aggregates?', 'It is heated, pumped through insulated lines, measured, and either introduced into the pugmill (batch) or added at a designated point in the drum (continuous).']]],
  ['Mix design and quality', [
    ['What is a Job Mix Formula?', 'The approved mix design that defines aggregate fractions and grading, binder type and content, filler and other specified parameters.'],
    ['What is Marshall Mix Design?', 'A method that prepares compacted specimens at different binder contents and evaluates stability, flow and volumetric properties to select the mix.'],
    ['What is optimum binder content?', 'The binder proportion selected through the specified mix-design procedure to meet the volumetric and performance requirements.'],
    ['What are air voids?', 'The volume of air spaces within the compacted mixture. They matter for performance and durability.'],
    ['What is VMA?', 'Voids in Mineral Aggregate: the void space between the aggregate particles in the compacted mix, including air voids and effective binder volume.'],
    ['What is VFB?', 'Voids Filled with Bitumen: the proportion of the VMA occupied by effective bitumen.'],
    ['What is Marshall stability?', 'The maximum load a prepared specimen supports under the prescribed Marshall test method.'],
    ['What is Marshall flow?', 'The deformation of the specimen associated with the Marshall stability test.'],
    ['Why is aggregate gradation important?', 'It decides the aggregate skeleton, density, stability, workability, air-void structure, durability and resistance to deformation.'],
    ['Which tests are performed on Hot Mix?', 'Depending on the mix and project: gradation, binder content, bulk and maximum theoretical specific gravity, air voids, VMA, VFB, Marshall properties, moisture susceptibility, field density and core testing.']]],
  ['Construction', [
    ['How is Hot Mix transported?', 'In suitable tipper vehicles, with covering where required, coordinated with the paving operation so that the mix arrives while it can still be laid and compacted.'],
    ['Why is asphalt temperature important?', 'It affects binder viscosity, workability and compaction. If the mix is too cool it is hard to spread and compact; an overheated binder can age or degrade. The ranges come from the specification and approved procedure.'],
    ['What is prime coat?', 'A specified bituminous treatment applied to a prepared granular surface before the next pavement layer.'],
    ['What is tack coat?', 'A thin, uniform bituminous application that promotes bonding between specified pavement layers.'],
    ['How does an asphalt paver work?', 'The mix is received in the hopper, carried back by a conveyor, spread across the width by an auger and levelled by the screed into a mat.'],
    ['Why is compaction necessary?', 'To achieve the required density and volumetric structure, reduce excessive air voids, improve particle contact and reach the surface profile.'],
    ['What is the function of a road roller?', 'It compacts the freshly laid mat, in the sequence and with the equipment set by the approved rolling procedure.'],
    ['How is asphalt density measured?', 'By field density testing and by testing core samples, using the method and acceptance limits set in the contract.'],
    ['How are asphalt core samples collected?', 'A core-drilling machine cuts a cylindrical sample through the compacted layer, which is then tested, for example for thickness and density, as the quality plan requires.'],
    ['How long before asphalt pavement can be opened to traffic?', 'There is no universal time. The pavement is opened only when the applicable specification permits and the Engineer approves.']]],
  ['Applications and procurement', [
    ['Where is Hot Mix used?', 'Highways, state, district, urban, rural and industrial roads, logistics and commercial areas, widening, resurfacing, rehabilitation, bridge approaches, junctions, parking areas and repair works, with the mix chosen by the project designer.'],
    ['Is Hot Mix suitable for highways?', 'Yes, where the pavement design and specification call for DBM, BC or another specified bituminous mix in the highway layers.'],
    ['What is Hot Mix used for in road resurfacing?', 'To place a new bituminous surface over a suitably prepared existing pavement.'],
    ['How much Hot Mix is needed per kilometre of road?', 'It depends on the road width, the compacted thickness and the approved compacted density. Use the calculator on this page with your own values; no figure is assumed.'],
    ['How is Hot Mix quantity calculated?', 'Compacted volume = length × width × compacted thickness. Theoretical mass = volume × the approved compacted density. Final quantities follow the BOQ and measurement method.'],
    ['What affects Hot Mix prices?', 'Aggregate, binder, filler and additive costs, mix type, plant and fuel costs, quality control, transport distance, delivery schedule, quantity and the contract conditions.'],
    ['Who supplies Hot Mix in Goa?', L.HMA.verified ? 'VERIFIED STATE: replace with the confirmed statement.' : 'This page does not name a supplier. For works under the Goa PWD circular, the plant must be installed within Goa and meet the plant conditions. OM GROUP does not state on this page that it supplies Hot Mix; if you need it, share the requirement and availability will be confirmed.'],
    ['How do I request a DBM quotation?', 'Share the mix type, governing specification, grading, binder grade, approved JMF, quantity, delivery location and schedule using the enquiry builder above.'],
    ['How do I request a BC quotation?', 'The same way: mix type, specification, JMF, quantity, delivery location and schedule. Availability and the commercial response are confirmed against your requirement.'],
    ['What documents are required before ordering Hot Mix?', 'Where required: the approved JMF, binder certificate, aggregate test results, production records, temperature records, mix test results and the delivery challan.']]]
];
function faq() {
  let n = 0;
  return `\n<section class="sec" id="faq" aria-labelledby="faqTitle"><div class="wrap">
    <p class="ap-kicker">FAQ</p><h2 class="ap-h2" id="faqTitle">Hot Mix Asphalt: Frequently Asked Questions</h2>
    <div class="hma-faqs">${FAQ.map(g => `<div class="hma-faqg"><h3 class="ap-h3 hma-faqh">${g[0]}</h3><div class="faq">${g[1].map(q => `<details><summary>${++n}. ${q[0]}<span class="faq-icon" aria-hidden="true"></span></summary><div class="faq-a"><p>${q[1]}</p></div></details>`).join('')}</div></div>`).join('')}</div>
  </div></section>\n`;
}

/* ============ final CTA, related, references, footer ============ */
function enquire() {
  return `\n<section class="final on-dark" id="enquire" aria-labelledby="enqTitle"><div class="wrap">
    <span class="eyebrow">Planning a road construction project?</span>
    <h2 id="enqTitle">The quality of the road begins with the quality of the mix.</h2>
    <p>Share your required mix type, governing specification, quantity, delivery location and project schedule. If you have the approved JMF or BOQ, mention it. OM GROUP can review the requirement and confirm what can be done against it: Hot Mix availability and supply arrangements are not assumed and are confirmed per enquiry.</p>
    <div class="cta-row">
      ${cta(MSG.req, 'hot_mix_quote_click', 'final', 'Discuss Your Hot Mix Requirement')}
      ${cta(MSG.spec, 'hot_mix_quote_click', 'final_spec', 'Submit Your Mix Specification', 'btn-ghost', false)}
      ${cta(MSG.tech, 'hot_mix_technical_request', 'final', 'Request Technical Information', 'btn-ghost', false)}
    </div>
    <p class="micro">The standard enquiry form opens with your message already written. Add your details and send it there.</p>
    <div class="ap-contact">
      <a href="tel:+919049629684" data-ev="hot_mix_phone_click" data-loc="final">+91 90496 29684</a>
      <a href="tel:+918788732881" data-ev="hot_mix_phone_click" data-loc="final">+91 87887 32881</a>
      <a href="mailto:info@omgroupco.com">info@omgroupco.com</a>
      <a href="https://wa.me/919049629684?text=Hi%2C%20I%27d%20like%20to%20discuss%20a%20Hot%20Mix%20Asphalt%20requirement." target="_blank" rel="noopener" data-ev="hot_mix_whatsapp_click" data-loc="final">WhatsApp</a>
    </div>
  </div></section>\n`;
}
function related() {
  return `\n<section class="ap-sec" id="related" aria-labelledby="relTitle"><div class="wrap">
    <p class="ap-kicker">Related</p><h2 class="ap-h2" id="relTitle">Explore Related Road Materials and Applications</h2>
    <p class="ap-rel-links">
      <a class="ap-link" href="/applications/wet-mix-macadam/">Wet Mix Macadam applications</a><a class="ap-link" href="/applications/granular-sub-base/">Granular Sub-Base applications</a>
      <a class="ap-link" href="/products/wmm">WMM aggregate</a><a class="ap-link" href="/products/granular-sub-base">Granular Sub-Base: GSB</a>
      <a class="ap-link" href="/products/20mm-aggregate">20mm aggregate</a><a class="ap-link" href="/applications/20mm-aggregates/">20mm applications</a>
      <a class="ap-link" href="/products/10mm-aggregate">10mm aggregate</a><a class="ap-link" href="/applications/10mm-aggregates/">10mm applications</a>
      <a class="ap-link" href="/products/6mm-aggregate">6mm aggregate</a><a class="ap-link" href="/applications/6mm-aggregates/">6mm applications</a>
      <a class="ap-link" href="/products/12mm-aggregate">12.5mm aggregate</a><a class="ap-link" href="/products/40mm-aggregate">40mm aggregate</a><a class="ap-link" href="/products/60mm-aggregate">60mm aggregate</a>
      <a class="ap-link" href="/products/boulders">Construction boulders</a><a class="ap-link" href="/products/ready-mix-concrete">Ready-Mix Concrete</a>
      <a class="ap-link" href="/products/m-sand">M-Sand</a><a class="ap-link" href="/products/washed-sand">Washed Sand</a><a class="ap-link" href="/products/plaster-sand">Plaster Sand</a>
      <a class="ap-link" href="/products">OM GROUP construction material catalogue</a><a class="ap-link" href="/applications">Explore all construction material applications</a><a class="ap-link" href="/#about">About OM GROUP</a>
    </p></div></section>

<section class="ap-sec ap-sec--bone" id="references" aria-labelledby="refTitle" style="padding:72px 0"><div class="wrap">
  <h2 class="ap-h2" id="refTitle" style="font-size:clamp(26px,3vw,38px)">Technical References</h2>
  <ol class="ap-refs">
    <li><strong>MoRTH: Specifications for Road and Bridge Works, Fifth Revision (2013), Section 500.</strong> Bituminous pavement provisions under the applicable contracts.</li>
    <li><strong>MoRTH: Specifications for Road and Bridge Works, Sixth Revision (October 2026).</strong> Effective for National Highway works from 1 January 2027 under the cited circular.</li>
    <li><strong>MoRTH Circular No. 407.29, dated 29 October 2026.</strong> Implementation of the Sixth Revision for National Highway works.</li>
    <li><strong>Goa PWD Circular No. 1-8-05/SSW-PWD/Vol-I/2026-27/63, dated 15 May 2026.</strong> Special conditions for hot mix plant use in specified bituminous road works in Goa.</li>
    <li><strong>IRC:90-2010,</strong> Guidelines for Selection, Operation and Maintenance of Bituminous Hot Mix Plant.</li>
    <li><strong>IRC:SP:135-2022,</strong> Manual for the Design of Hot Bituminous Mixes.</li>
    <li><strong>IS 73:2013,</strong> Paving Bitumen: Specification. <strong>IS 8887,</strong> Bitumen Emulsion. <strong>IS 1201 to IS 1220,</strong> methods of testing tar and bituminous materials.</li>
    <li><strong>IRC:27-2009,</strong> Specifications for Bituminous Macadam, where adopted and applicable. <strong>IRC:111,</strong> Specification for Dense Graded Bituminous Mixes (verify the applicable edition).</li>
    <li><strong>Aggregate-testing standards</strong> referenced by the governing specification and mix design.</li>
  </ol>
  <p class="ap-small">Check the editions, amendments and the contract that apply to your project. This page is general guidance on Hot Mix Asphalt. It is not engineering advice, a mix design or an approval of any mix, and it makes no claim about any OM GROUP plant, product or test result.</p>
</div></section>
`;
}
function footer() {
  return `
</main>

<footer>
  <div class="wrap">
    <div class="foot-cols">
      <nav class="foot-nav" aria-label="Products">
        <span class="foot-nav-label">Products</span>
        <a href="/applications">All Applications</a>
        <a href="/products/6mm-aggregate/">6mm Aggregate</a>
        <a href="/products/10mm-aggregate/">10mm Aggregate</a>
        <a href="/products/12mm-aggregate/">12.5mm Aggregate</a>
        <a href="/products/20mm-aggregate/">20mm Aggregate</a>
        <a href="/products/40mm-aggregate/">40mm Aggregate</a>
        <a href="/products/60mm-aggregate/">60mm Aggregate</a>
        <a href="/products/boulders/">Construction Boulders</a>
        <a href="/products/m-sand/">M-Sand (Manufactured Sand)</a>
        <a href="/products/plaster-sand/">Plaster Sand (P-Sand)</a>
        <a href="/products/concrete-sand/">Concrete Sand</a>
        <a href="/products/river-sand/">River Sand</a>
        <a href="/products/washed-sand/">Washed Sand</a>
        <a href="/products/ready-mix-concrete/">Ready-Mix Concrete (RMC)</a>
        <a href="/products/granular-sub-base/">Granular Sub-Base (GSB)</a>
        <a href="/products/wmm/">Wet Mix Macadam (WMM)</a>
        <a href="/products">All Products</a>
      </nav>
    </div>
    <p class="legal">OM GROUP, Goa, India. Phone <a href="tel:+919049629684">+91-9049629684</a> and <a href="tel:+918788732881">+91-8788732881</a>, WhatsApp <a href="https://wa.me/919049629684" target="_blank" rel="noopener">+91-9049629684</a>, <a href="mailto:info@omgroupco.com">info@omgroupco.com</a>, head office Chicalim, Mormugao.<br />&copy; 2026 OM GROUP. All rights reserved. &nbsp;|&nbsp; <a href="/privacy-policy">Privacy Policy</a> &nbsp;|&nbsp; <a href="/terms-and-conditions">Terms &amp; Conditions</a></p>
  </div>
</footer>

<div class="sticky-bar" id="stickyBar">
  <a class="q" href="/#contact" data-ev="hero_cta_click" data-button="sticky_request_quote">Quote</a>
  <a href="tel:+919049629684" data-ev="call_click" data-loc="sticky_bar">Call</a>
  <a href="https://wa.me/919049629684?text=Hi%20OM%20GROUP%2C%20I%20need%20a%20quote%20for%20%5Bapplication%5D.%20Material%3A%20%5B%20%5D.%20Quantity%3A%20%5B%20%5D.%20Location%3A%20%5B%20%5D.%20Delivery%20date%3A%20%5B%20%5D." target="_blank" rel="noopener" data-ev="whatsapp_click" data-loc="sticky_bar">WhatsApp</a>
</div>

<script src="/assets/smooth-scroll.js" defer></script>
<script src="/assets/application-fill.js" defer></script>
<script src="/assets/application-ink.js" defer></script>
<script src="/assets/application-wipe.js" defer></script>
<script src="/assets/application-hma.js" defer></script>
</body>
</html>
`;
}
module.exports = { applications, compare, standards, quantity, whyOm, order, faq, enquire, related, footer, FAQ };
