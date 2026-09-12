// Audit: list every blob under products/legas and dump to /tmp/blobs.json.
import fs from 'node:fs';
import { list } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('Missing BLOB_READ_WRITE_TOKEN');
  process.exit(1);
}

const blobs = [];
let cursor;
do {
  const res = await list({
    token,
    prefix: 'products/legas/',
    cursor,
    limit: 1000,
  });
  blobs.push(
    ...res.blobs.map((b) => ({
      pathname: b.pathname,
      url: b.url,
      size: b.size,
    })),
  );
  cursor = res.cursor;
} while (cursor);

fs.writeFileSync('/tmp/blobs.json', JSON.stringify(blobs, null, 2));

const byExt = {};
let total = 0;
for (const b of blobs) {
  const ext = (b.pathname.match(/\.([a-z0-9]+)$/i) || [
    ,
    'none',
  ])[1].toLowerCase();
  byExt[ext] = byExt[ext] || { n: 0, bytes: 0 };
  byExt[ext].n++;
  byExt[ext].bytes += b.size || 0;
  total += b.size || 0;
}
console.log(
  'total blobs:',
  blobs.length,
  '| total',
  (total / 1048576).toFixed(1),
  'MB',
);
for (const [ext, v] of Object.entries(byExt).sort()) {
  console.log(`  ${ext}: ${v.n} files, ${(v.bytes / 1048576).toFixed(1)}MB`);
}
