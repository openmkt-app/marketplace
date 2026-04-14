const https = require('https');

https.get('https://savillas-arts-and-trinkets.myshopify.com/products/blue-pearlescent-maple-leaf-earrings', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // try to find og:image
    const ogRegex = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/gi;
    let match;
    console.log("---- og:images ----");
    while ((match = ogRegex.exec(data)) !== null) {
      console.log(match[1]);
    }
    
    // try to find json-ld
    const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    console.log("---- json-ld ----");
    while ((match = jsonLdRegex.exec(data)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        if (json['@type'] === 'Product') {
            console.log(JSON.stringify(json.image, null, 2));
        }
      } catch (e) {}
    }
  });
});
