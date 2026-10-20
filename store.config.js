const fs = require('node:fs');
const path = require('node:path');
const config = require('./store.config.json');

// Apple review contacts are private. Never copy a metadata pull containing them
// into the tracked JSON. Without this file EAS leaves review contacts unchanged.
const contactPath = path.join(__dirname, 'store.private.json');
if (fs.existsSync(contactPath)) {
  config.apple.review = {
    ...JSON.parse(fs.readFileSync(contactPath, 'utf8')),
    demoRequired: false,
    notes: fs.readFileSync(path.join(__dirname, 'docs/APP-REVIEW-NOTES.txt'), 'utf8').trim(),
  };
}
module.exports = config;
