const fs = require('fs');
const data = fs.readFileSync('scratch-shopify.html', 'utf8');

const regex = /([^"'\s]+rn-image_picker_lib_temp[^"'\s]+)/gi;
let match;
const matches = new Set();
while ((match = regex.exec(data)) !== null) {
  matches.add(match[1]);
}
console.log([...matches].join('\n'));
