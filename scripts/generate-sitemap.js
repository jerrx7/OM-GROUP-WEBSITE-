const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://www.omgroupco.com';
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap.xml');

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

function generateSitemap() {
  console.log('Generating sitemap...');
  
  // Find all HTML files in root directory
  const files = fs.readdirSync(ROOT_DIR);
  const htmlFiles = files.filter(f => f.endsWith('.html'));

  const urls = [];

  for (const file of htmlFiles) {
    // Exclude backup files or landing variants
    if (file.toLowerCase().includes('landing')) {
      console.log(`Excluding template/backup file: ${file}`);
      continue;
    }

    const filePath = path.join(ROOT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Exclude if contains noindex
    if (content.includes('noindex')) {
      console.log(`Excluding noindex page: ${file}`);
      continue;
    }

    // Determine path
    let urlPath = file;
    if (file === 'index.html') {
      urlPath = ''; // Root page maps to /
    }

    const stats = fs.statSync(filePath);
    const lastMod = formatDate(stats.mtime);
    
    // Add to sitemap URL set
    urls.push({
      loc: `${BASE_URL}/${urlPath}`,
      lastmod: lastMod,
      changefreq: 'weekly',
      priority: file === 'index.html' ? '1.0' : '0.8'
    });
  }

  // Generate XML content
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const url of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>\n';

  fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
  console.log(`Sitemap generated successfully at: ${OUTPUT_FILE}`);
}

generateSitemap();
