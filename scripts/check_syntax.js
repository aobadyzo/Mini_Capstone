const fs = require('fs');
const path = require('path');

function walk(dir) {
  const res = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue;
      res.push(...walk(full));
    } else if (stat.isFile() && full.endsWith('.js')) {
      res.push(full);
    }
  }
  return res;
}

const root = path.resolve(__dirname, '..');
const files = walk(root);
let errors = [];
console.log('Checking', files.length, 'JS files for syntax...');
for (const f of files) {
  try {
    const src = fs.readFileSync(f, 'utf8');
    // Try to compile the source without running it
    // Wrap in anonymous function to avoid top-level return issues
    new Function(src);
  } catch (err) {
    errors.push({ file: f, error: err && err.message ? err.message : String(err) });
  }
}
if (errors.length === 0) {
  console.log('No syntax errors found.');
  process.exit(0);
}
console.log('Found', errors.length, 'files with syntax errors:');
for (const e of errors) {
  console.log('---', e.file);
  console.log(e.error);
}
process.exit(2);
