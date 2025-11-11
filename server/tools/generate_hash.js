
const bcrypt = require('bcrypt');

async function main() {
  const pw = process.argv[2];
  if (!pw) {
    console.error('Usage: node tools/generate_hash.js <password>');
    process.exit(1);
  }
  const saltRounds = 10;
  const hash = await bcrypt.hash(pw, saltRounds);
  console.log('BCRYPT_HASH=' + hash);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
