/* turns the Cycles shadow pass (alpha = shadow) into a black webp with alpha: assets/3d/om-group-rmc-plant-shadow.webp. Needs sharp (om-group-scroll-test/node_modules). */
const sharp = require('sharp'), path = require('path'), root = path.resolve(__dirname, '..', '..');
(async () => {
  const { data, info } = await sharp(path.join(root, '_review/excavator3d/' + (process.argv[2] || 'plant-shadow') + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4); for (let i = 0; i < info.width * info.height; i++) { out[i * 4 + 3] = data[i * 4 + 3]; }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 80, alphaQuality: 90, exact: true }).toFile(path.join(root, 'assets/3d/' + (process.argv[3] || 'om-group-rmc-plant-shadow') + '.webp')); console.log('ok', info.width, info.height);
})();
