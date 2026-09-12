// One-off: delete files from Vercel Blob by URL.
// Usage: BLOB_READ_WRITE_TOKEN=... node scripts/delete-blob.mjs <url> [url...]
import { del } from '@vercel/blob';

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error('Usage: node scripts/delete-blob.mjs <url> [url...]');
  process.exit(1);
}
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('Missing BLOB_READ_WRITE_TOKEN');
  process.exit(1);
}
await del(urls, { token });
console.log('deleted:', urls.join(', '));
