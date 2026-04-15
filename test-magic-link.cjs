const https = require('https');

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

async function main() {
  const url = 'https://www.ebay.com/itm/267320613152';
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  console.log('Fetching:', url);
  const r = await get(url, {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  });

  console.log('Status:', r.status, '| Size:', r.data.length, 'bytes');

  // 1. All meta tags
  console.log('\n--- PRICE META TAGS ---');
  const metaRegex = /<meta[^>]+>/gi;
  let m;
  while ((m = metaRegex.exec(r.data)) !== null) {
    if (/price|amount|currency/i.test(m[0])) console.log(m[0].replace(/\s+/g, ' ').trim());
  }

  // 2. JSON-LD
  console.log('\n--- JSON-LD ---');
  const ldRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let ld;
  while ((ld = ldRegex.exec(r.data)) !== null) {
    try { console.log(JSON.stringify(JSON.parse(ld[1]), null, 2)); } catch(e) {}
  }

  // 3. eBay image patterns
  console.log('\n--- IMAGE PATTERNS ---');
  const imgPatterns = [
    /ebayimg\.com[^"'\s]+/gi,
    /"images"\s*:\s*\[([^\]]+)\]/gi,
    /mainImgUrl[^;]{0,200}/gi,
    /maxImageUrl[^;]{0,200}/gi,
    /"imageUrl"\s*:\s*"([^"]+)"/gi,
    /s-l\d+\.jpg/gi,
  ];
  const found = new Set();
  for (const pat of imgPatterns) {
    let pm;
    while ((pm = pat.exec(r.data)) !== null) {
      const hit = pm[0].substring(0, 150);
      if (!found.has(hit)) { found.add(hit); console.log(hit); }
    }
  }

  // 4. Price patterns
  console.log('\n--- PRICE PATTERNS ---');
  const pricePatterns = [
    /"\$[\d,]+\.?\d{0,2}"/g,
    /"price"\s*:\s*"?[\d\.]+/gi,
    /itemprop="price"[^>]+content="([^"]+)"/gi,
    /x-price[^<]{0,200}/gi,
    /"pricingInfo"[^}]{0,300}/gi,
  ];
  const foundP = new Set();
  for (const pat of pricePatterns) {
    let pm;
    while ((pm = pat.exec(r.data)) !== null) {
      const hit = pm[0].substring(0, 200);
      if (!foundP.has(hit)) { foundP.add(hit); console.log(hit); }
    }
  }
}

main().catch(console.error);
