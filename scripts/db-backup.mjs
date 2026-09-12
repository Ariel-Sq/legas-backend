// Database backup for the Legas prod (Neon) database.
//
// - Dumps via the `postgres:latest` Docker image because the host pg_dump (16)
//   refuses a Neon server (17) due to the major-version check.
// - Saves a local custom-format dump under legas/backups/db/.
// - Encrypts it (AES-256) with BACKUP_KEY and uploads the .enc to Vercel Blob.
//   The Blob store is public, so the plaintext dump is NEVER uploaded.
// - Keeps the last KEEP backups locally.
//
// Usage:
//   node scripts/db-backup.mjs
//   BACKUP_KEEP=20 node scripts/db-backup.mjs
//
// Requires: docker, and DATABASE_URL_UNPOOLED (env or .env.local),
// BLOB_READ_WRITE_TOKEN (env or .env.local).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BACKEND_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const PROJECT_DIR = path.resolve(BACKEND_DIR, '../..'); // legas/
const BACKUP_DIR = path.join(PROJECT_DIR, 'backups', 'db');
const KEY_FILE = path.join(PROJECT_DIR, 'backups', '.backup_key');
const KEEP = parseInt(process.env.BACKUP_KEEP || '10', 10);

function loadEnv(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.join(BACKEND_DIR, '.env.local');
  if (fs.existsSync(envPath)) {
    const line = fs
      .readFileSync(envPath, 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${key}=`));
    if (line)
      return line
        .slice(key.length + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
  }
  return undefined;
}

function getKey() {
  // Prefer BACKUP_KEY from the environment (.env.local), then the standalone
  // key file, and only generate a new one if neither exists.
  const fromEnv = loadEnv('BACKUP_KEY');
  if (fromEnv) return fromEnv;
  if (fs.existsSync(KEY_FILE)) return fs.readFileSync(KEY_FILE, 'utf8').trim();
  // Generate one on first run and keep it local (chmod 600).
  const key = crypto.randomBytes(32).toString('base64');
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });
  console.log(
    `! Generated a new backup key at ${KEY_FILE} — SAVE IT somewhere safe.`,
  );
  return key;
}

const dbUrl = loadEnv('DATABASE_URL_UNPOOLED');
if (!dbUrl) {
  console.error('Missing DATABASE_URL_UNPOOLED (env or .env.local)');
  process.exit(1);
}
const blobToken = loadEnv('BLOB_READ_WRITE_TOKEN');
const key = getKey();

fs.mkdirSync(BACKUP_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
const base = `legas-prod-${stamp}`;
const dumpPath = path.join(BACKUP_DIR, `${base}.dump`);
const encPath = path.join(BACKUP_DIR, `${base}.dump.enc`);

// 1) Dump (custom format) straight to disk.
const outFd = fs.openSync(dumpPath, 'w');
const t0 = Date.now();
execFileSync(
  'docker',
  [
    'run',
    '--rm',
    'postgres:latest',
    'pg_dump',
    dbUrl,
    '-Fc',
    '--no-owner',
    '--no-privileges',
  ],
  { stdio: ['ignore', outFd, 'inherit'] },
);
fs.closeSync(outFd);
const dumpBytes = fs.statSync(dumpPath).size;
console.log(
  `dump: ${dumpPath} (${(dumpBytes / 1024).toFixed(0)} KB, ${Date.now() - t0} ms)`,
);

// 2) Encrypt.
execFileSync('openssl', [
  'enc',
  '-aes-256-cbc',
  '-pbkdf2',
  '-salt',
  '-in',
  dumpPath,
  '-out',
  encPath,
  '-pass',
  `pass:${key}`,
]);
const encBytes = fs.statSync(encPath).size;
console.log(`enc:  ${encPath} (${(encBytes / 1024).toFixed(0)} KB)`);

// 3) Upload the encrypted file to Vercel Blob (off-site).
if (blobToken) {
  const { put } = await import('@vercel/blob');
  const res = await put(
    `backups/db/${base}.dump.enc`,
    fs.readFileSync(encPath),
    {
      access: 'public',
      token: blobToken,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/octet-stream',
    },
  );
  console.log(`blob: ${res.url}`);
} else {
  console.warn('! BLOB_READ_WRITE_TOKEN not set — skipping off-site upload');
}

// 4) Rotate local backups (keep the last KEEP dumps + their .enc).
const dumps = fs
  .readdirSync(BACKUP_DIR)
  .filter((f) => f.endsWith('.dump'))
  .sort();
for (const f of dumps.slice(0, Math.max(0, dumps.length - KEEP))) {
  fs.rmSync(path.join(BACKUP_DIR, f), { force: true });
  fs.rmSync(path.join(BACKUP_DIR, `${f}.enc`), { force: true });
  console.log(`pruned: ${f}`);
}
console.log('done.');
