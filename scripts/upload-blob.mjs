// One-off: upload a single local file to Vercel Blob at a fixed pathname.
// Usage: BLOB_READ_WRITE_TOKEN=... node scripts/upload-blob.mjs <localFile> <blobPathname>
import fs from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';

const [, , localFile, blobPathname] = process.argv;
if (!localFile || !blobPathname) {
  console.error(
    'Usage: node scripts/upload-blob.mjs <localFile> <blobPathname>',
  );
  process.exit(1);
}
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('Missing BLOB_READ_WRITE_TOKEN');
  process.exit(1);
}

const body = fs.readFileSync(path.resolve(localFile));
const contentType = blobPathname.endsWith('.webp')
  ? 'image/webp'
  : blobPathname.endsWith('.png')
    ? 'image/png'
    : 'image/jpeg';

const res = await put(blobPathname, body, {
  access: 'public',
  token,
  addRandomSuffix: false,
  contentType,
});
console.log('uploaded:', res.url);
