const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, '.comments_backup');
const exts = ['.js', '.css', '.html'];

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

function walk(dir){
  const list = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()){
      if(e.name === 'node_modules' || e.name === '.git' || e.name === '.comments_backup') continue;
      list.push(...walk(full));
    } else if(exts.includes(path.extname(e.name).toLowerCase())){
      list.push(full);
    }
  }
  return list;
}

function preserveAndStripJS(content){
  // preserve shebang
  let shebang = '';
  if(content.startsWith('#!')){
    const idx = content.indexOf('\n');
    shebang = content.slice(0, idx+1);
    content = content.slice(idx+1);
  }

  // preserve license/block comments that start with /*! or contain @license or copyright
  const preserved = [];
  content = content.replace(/\/\*[\s\S]*?\*\//g, (m)=>{
    if(/^\/\*!/.test(m) || /@license/i.test(m) || /copyright/i.test(m)){
      const key = `___PRESERVE_BLOCK_${preserved.length}___`;
      preserved.push(m);
      return key;
    }
    return '';
  });

  // remove leading // comment lines
  content = content.replace(/^\s*\/\/.*$/gm, '');

  // remove any remaining block comments (should be none) just in case
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');

  // restore preserved blocks
  preserved.forEach((b,i)=>{
    content = content.replace(`___PRESERVE_BLOCK_${i}___`, b);
  });

  return shebang + content;
}

function stripHTMLComments(content){
  // preserve license-like HTML comments
  const preserved = [];
  content = content.replace(/<!--([\s\S]*?)-->/g, (m, inner)=>{
    if(/@license/i.test(inner) || /copyright/i.test(inner)){
      const key = `___PRESERVE_HTML_${preserved.length}___`;
      preserved.push(m);
      return key;
    }
    return '';
  });
  preserved.forEach((b,i)=>{ content = content.replace(`___PRESERVE_HTML_${i}___`, b); });
  return content;
}

ensureDir(BACKUP_DIR);
const files = walk(ROOT);
if(files.length === 0){ console.log('No target files found.'); process.exit(0); }

const summary = { total: files.length, modified: 0, backedUp: 0 };
for(const f of files){
  try{
    const rel = path.relative(ROOT, f);
    const data = fs.readFileSync(f, 'utf8');

    // backup
    const dest = path.join(BACKUP_DIR, rel);
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, data, 'utf8');
    summary.backedUp++;

    let out = data;
    const ext = path.extname(f).toLowerCase();
    if(ext === '.js' || ext === '.css'){
      out = preserveAndStripJS(out);
    } else if(ext === '.html'){
      out = stripHTMLComments(out);
    }

    if(out !== data){
      fs.writeFileSync(f, out, 'utf8');
      summary.modified++;
      console.log('Stripped comments:', rel);
    } else {
      console.log('No changes:', rel);
    }
  } catch(err){ console.error('Failed processing', f, err); }
}

console.log('Done. Summary:', summary);
console.log('Original files saved under .comments_backup/');
