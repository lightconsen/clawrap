// Simple script to create a PNG from SVG using native macOS tools
const { execSync } = require('child_process');
const fs = require('fs');

// Use qlmanage to convert SVG to PNG (deprecated but still works)
try {
  execSync('qlmanage -t -s 512 -o build/ build/icon.svg', { stdio: 'ignore' });
  // qlmanage creates build/icon.svg.png
  fs.renameSync('build/icon.svg.png', 'build/icon.png');
  console.log('Created build/icon.png using qlmanage');
} catch (e) {
  console.error('qlmanage failed:', e.message);
  process.exit(1);
}
