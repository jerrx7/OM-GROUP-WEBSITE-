/* OM GROUP - Hot Mix Asphalt application page: the supplied photographs -> responsive web assets.
   Source folder: Downloads\OM GROUP WEBSITE APPLICATIONS\HOT MIX (33 PNG; most 1672x941, eight are portrait 1122x1402).   Run: node scripts/hma/export-photos.js
   -> img/applications/hot-mix-asphalt/<slug>-{640,1000,1600}.{webp,avif}   (+ three crops of the aggregate / filler picture) */
const path = require('path'), fs = require('fs'), sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..', '..'), OUT = path.join(ROOT, 'img', 'applications', 'hot-mix-asphalt');
const SRC = process.env.HMA_SRC || path.join(require('os').homedir(), 'Downloads', 'OM GROUP WEBSITE APPLICATIONS', 'HOT MIX');
const MAP = {
  'Asphalt Ingredients to Finished Mix': 'hot-mix-asphalt-ingredients',
  'Asphalt Plant Dust Collection System': 'asphalt-plant-baghouse-filter',
  'Asphalt Plant Truck Loading': 'hot-mix-asphalt-tipper-loading',
  'Asphalt Prime Coat Application': 'prime-coat-road-construction',
  'Asphalt Quality Control Inspection': 'hot-mix-asphalt-temperature-check',
  'Coarse Gravel and Fine Powder Comparison': 'fine-aggregate-mineral-filler-asphalt',
  'Coarse and Fine Asphalt Comparison': 'asphalt-coarse-fine-texture-comparison',
  'Glossy Charcoal Asphalt Aggregate': 'hot-mix-asphalt-surface-texture',
  'Golden-Hour Industrial Tank Farm': 'bitumen-storage-tanks-asphalt-plant',
  'Gritty Asphalt Road Texture': 'compacted-asphalt-surface-texture',
  'Hot Aggregate Bin Tower Infographic': 'asphalt-hot-bin-storage',
  'Hot Aggregate Screening Tower': 'batch-asphalt-hot-aggregate-screening',
  'Industrial Aggregate Processing Plant': 'asphalt-plant-cold-feed-bins',
  'Industrial Asphalt Paving Operation': 'hot-mix-asphalt-road-construction',
  'Industrial Asphalt Plant Panorama': 'asphalt-mixing-plant-overview',
  'Industrial Bitumen Pouring into Steel Drum': 'bitumen-binder-close-up',
  'Industrial Conveyor Feeding Asphalt Plant': 'asphalt-aggregate-conveyor',
  'Industrial Plant Control Room Operator': 'asphalt-plant-control-room',
  'Industrial Quarry Loader and Conveyor Yard': 'asphalt-aggregate-stockpiles',
  'Industrial Quarry Rock Pile': 'coarse-aggregate-for-asphalt',
  'Industrial Weighbridge at an Aggregate Plant': 'asphalt-plant-weighbridge',
  'Industrial Weighbridge with Dump Truck': 'hot-mix-asphalt-dispatch-weighbridge',
  'Materials Testing Lab with Bitumen, Pellets, and Powders': 'bitumen-additive-filler-samples',
  'Modern Industrial Logistics Park': 'industrial-asphalt-access-road',
  'Precision Bitumen Testing Laboratory': 'asphalt-bitumen-binder-laboratory-test',
  'Road Paver Laying Fresh Asphalt': 'asphalt-paver-hot-mix-laying',
  'Road Roller Paving a Sunny Highway': 'tandem-roller-asphalt-compaction',
  'Roadway Core Drilling Inspection': 'asphalt-pavement-core-sampling',
  'Roadwork Supervisors Overseeing Asphalt Paving': 'hot-mix-site-inspection',
  'Rotary Drum Dryer Cutaway in Operation': 'asphalt-rotary-dryer-cutaway',
  'Tropical Coastal Highway Vista': 'finished-asphalt-highway',
  'Twin-Shaft Pugmill Mixing Process': 'asphalt-pugmill-mixer-cutaway',
  'Urban Road Resurfacing Operation': 'urban-asphalt-road-construction'
};
const CROPS = { // slug: [source name, left, top, width, height]
  'fine-aggregate-crop': ['Coarse Gravel and Fine Powder Comparison', 0, 380, 570, 900],
  'mineral-filler-crop': ['Coarse Gravel and Fine Powder Comparison', 430, 580, 692, 740]
};
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const jobs = [], manifest = {};
  for (const [name, slug] of Object.entries(MAP)) { const m = await sharp(path.join(SRC, name + '.png')).metadata(); manifest[slug] = { w: m.width, h: m.height, sizes: m.width > m.height ? [640, 1000, 1600] : [560, 900, 1122] }; jobs.push([slug, () => sharp(path.join(SRC, name + '.png')), manifest[slug].sizes]); }
  for (const [slug, [name, l, t, w, h]] of Object.entries(CROPS)) { const buf = await sharp(path.join(SRC, name + '.png')).extract({ left: l, top: t, width: w, height: h }).toBuffer(); manifest[slug] = { w: w, h: h, sizes: [480, 570].filter(x => x <= w).slice(0, 2) }; if (w > 600) manifest[slug].sizes = [480, 692]; jobs.push([slug, () => sharp(buf), manifest[slug].sizes]); }
  for (const [slug, mk, sizes] of jobs) {
    for (const w of sizes) {
      await mk().resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(path.join(OUT, `${slug}-${w}.webp`));
      await mk().resize({ width: w, kernel: 'lanczos3', withoutEnlargement: true }).avif({ quality: 58, effort: 4 }).toFile(path.join(OUT, `${slug}-${w}.avif`));
    }
    process.stdout.write('.');
  }
  await sharp(path.join(SRC, 'Industrial Asphalt Paving Operation.png')).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, 'om-group-hot-mix-asphalt-road-construction-social.jpg'));
  fs.writeFileSync(path.join(__dirname, 'photos.json'), JSON.stringify(manifest, null, 1));
  console.log('\nexported ' + jobs.length + ' pictures');
})();
