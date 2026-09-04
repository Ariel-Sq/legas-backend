/* eslint-disable no-console */
/**
 * Attach real per-model photos to the Legas catalogue.
 *
 * Reads the source images from PHOTOS_SRC (defaults to the unzipped
 * "Legas img" folder), copies the chosen ones into the storage dir as
 * `products/legas/<slug>-N.<ext>`, and rebuilds each template's
 * variation images: the product photos first (first = main), then the
 * shared tint-sample photos appended at the end of every carousel.
 *
 * Deterministic / idempotent: every run fully rebuilds the images of the
 * templates listed in MAPPING plus re-applies the samples to ALL templates.
 * Templates NOT in MAPPING keep their existing catalogue "lámina" as the
 * product photo and just get the samples appended.
 *
 * Usage (local):
 *   npx ts-node -r tsconfig-paths/register scripts/load-photos.ts
 *
 * The photo numbers below are the ones from the review contact sheet.
 */
import * as fs from 'fs';
import * as path from 'path';
import { put } from '@vercel/blob';
import dataSource from '../src/typeorm.config';
import { ProductTemplate } from '../src/products/entities/product-template.entity';
import { ProductImage } from '../src/products/entities/product-image.entity';

const IMAGE_DIR = 'products/legas';
const STORAGE_ROOT = process.env.STORAGE_PATH || './.storage';
const DEST_DIR = path.join(STORAGE_ROOT, IMAGE_DIR);
const SP =
  '/tmp/claude-501/-Users-lopez-nami-legas/84e31bba-841b-4701-bfcd-b23c53ee2ee8/scratchpad';
const SRC_DIR = process.env.PHOTOS_SRC || `${SP}/legas-img/Legas img`;
// Retouched versions (seals removed, captioned sample) take precedence.
const PROCESSED_DIR = process.env.PHOTOS_PROCESSED || `${SP}/processed`;
// WebP versions (smallest, seals removed) win over everything.
const WEBP_DIR = process.env.PHOTOS_WEBP || `${SP}/webp`;
// Single captioned tint-sample file (resolved to its .webp variant).
const SAMPLE_FILE = 'muestra-tinta.jpg';

// Photo number (from the contact sheet) -> original filename in SRC_DIR.
const N: Record<number, string> = {
  1: '01d1ca4b-3165-45ea-a824-87d52e34aad5.jpg',
  2: '0fbe7a67-b7b1-45a2-a784-3e06b547c75e.jpg',
  3: '11f253d2-204d-4d6a-9d67-caffa7cd5b56.jpg',
  6: '1cba6a78-7572-4b85-a56a-a7046849389e.jpg',
  8: '222a860f-ff6d-4690-ba34-bae17cf2d25f.jpg',
  9: '26b3f661-669d-441a-ab1d-390bc23de266.jpg',
  10: '2a425a11-b589-4644-8063-2ef8380639de.jpg',
  11: '2c75f742-5471-4bee-aceb-eb3ebb1c98d1.jpg',
  12: '2d58b8c3-e36e-4d0e-aa20-0d3d01a01436.jpg',
  13: '3d828808-e947-41ec-83d9-2e4397e7de92.jpg',
  14: '47483f15-fafe-4ec2-aa15-44eca0f935bf.jpg',
  17: '58edd887-370d-4cea-9942-dc42b192061b.jpg',
  18: '5bf9ce0e-b8af-40ba-b938-85ccf80228f2.jpg',
  21: '71505b68-336c-4c8f-9a6a-03cf24490c3e.jpg',
  22: '738ae070-2eda-414e-8f10-fd8d0df60409.jpg',
  23: '84426863-cd2c-4e22-a1f8-23078795c096.jpg',
  26: '9cf240b5-02fc-4192-91c1-66a2c80694d6.jpg',
  27: '9ddaeb62-2801-46dd-b282-cc739c25f93c.jpg',
  28: '9de75142-9c94-4e4a-90bf-0ad69e54ec0e.jpg',
  30: 'aacb38fd-7f25-46fa-bc01-3ab383efc3bb.jpg',
  36: 'e37f13f9-bffa-4e66-a2f3-85b489acee24.jpg',
  37: 'eb984288-f722-4dfd-8d73-09c826438bf4.jpg',
  38: 'f29a23e2-fb1b-4145-870f-e38f9d7f1c4b.jpg',
  39: 'f8990b56-b2f8-4eed-b4fb-c55f0f5f26fc.jpg',
  41: 'IMG_5789.PNG',
  44: 'IMG_5792.PNG',
  45: 'IMG_5793.PNG',
  46: 'IMG_5794.PNG',
  50: 'IMG_5798.PNG',
  52: 'IMG_5800.PNG',
  // tint samples
  20: '6ff8bbe3-790e-4ba6-b80b-64a7ee335583.jpg',
  34: 'dae51dce-c37f-4043-a245-2ecb51735a19.jpg',
};

// Template slug -> ordered photo numbers (first becomes the main image).
// Entries marked DEFAULT are best-guesses to confirm on the local site.
const MAP: Array<[string, number[]]> = [
  ['mesa-comedor-ovalada-alamo', [6, 2]],
  ['mesa-de-luz-2-cajones', [9, 3, 13]],
  ['mesa-comedor-gerbasoni-petiribi-pata-central', [8, 30]],
  ['mesa-ratona-rectangular', [10]],
  ['mesa-comedor-gerbasoni-alamo-pata-cruz', [17, 39, 28, 36]],
  ['silla-bali-tapizada', [18]],
  ['comoda-alamo-6-cajones', [11, 21, 22]],
  ['silla-bali-madera', [37]],
  ['mesa-comedor-gerbasoni-alamo-pata-central', [46]],
  ['escritorio-alamo-2-cajones', [44, 12]],
  ['rack-alamo-2-puertas', [45]],
  ['recibidor-alamo-sin-cajones', [50]],
  ['perchero-alamo-cajon', [52]],
  ['mesa-comedor-gerbasoni-petiribi-pata-cruz', [41, 38]],
  // DEFAULT guesses — confirm on local:
  ['silla-bali-hilo-kraft', [1]],
  ['silla-ibiza-tapizada', [14, 26]],
  ['rack-alamo-2-cajones-4-puertas', [23]],
  ['mesa-comedor-gerbasoni-alamo-sin-nudos', [27]],
];

const IS_BLOB = process.env.STORAGE_TYPE === 'VERCEL_BLOB';

function ext(file: string): string {
  const e = path.extname(file).toLowerCase();
  return e === '.png' ? 'png' : e === '.webp' ? 'webp' : 'jpg';
}

function contentTypeFor(e: string): string {
  return e === 'png' ? 'image/png' : e === 'webp' ? 'image/webp' : 'image/jpeg';
}

/**
 * Resolve a source file, preferring the WebP version, then the retouched
 * copy in PROCESSED_DIR, then the raw original.
 */
function resolveSrc(filename: string): string {
  const stem = path.basename(filename, path.extname(filename));
  const webp = path.join(WEBP_DIR, `${stem}.webp`);
  if (fs.existsSync(webp)) return webp;
  const processed = path.join(PROCESSED_DIR, filename);
  if (fs.existsSync(processed)) return processed;
  const original = path.join(SRC_DIR, filename);
  if (fs.existsSync(original)) return original;
  throw new Error(`Missing source file: ${filename}`);
}

/**
 * Publish a source file under products/legas/<destBase>.<ext> and return its
 * logical path. LOCAL copies into the storage dir; VERCEL_BLOB uploads to the
 * Blob store (same pathname, no random suffix — matches StorageServiceBlob).
 */
async function copyFile(filename: string, destBase: string): Promise<string> {
  const abs = resolveSrc(filename);
  const e = ext(abs); // actual extension of the resolved file (usually webp)
  const destName = `${destBase}.${e}`;
  const logical = `${IMAGE_DIR}/${destName}`;
  if (IS_BLOB) {
    await put(logical, fs.readFileSync(abs), {
      access: 'public',
      addRandomSuffix: false,
      contentType: contentTypeFor(e),
      allowOverwrite: true,
    });
  } else {
    fs.copyFileSync(abs, path.join(DEST_DIR, destName));
  }
  return logical;
}

function copyPhoto(num: number, destBase: string): Promise<string> {
  const src = N[num];
  if (!src) throw new Error(`No source filename for photo #${num}`);
  return copyFile(src, destBase);
}

function makeImage(
  relPath: string,
  isMain: boolean,
  sortOrder: number,
  alt: string,
): ProductImage {
  const img = new ProductImage();
  img.path = relPath;
  img.url = `/api/images?path=${relPath}`;
  img.isMain = isMain;
  img.sortOrder = sortOrder;
  img.altText = alt;
  return img;
}

async function main() {
  if (!IS_BLOB) fs.mkdirSync(DEST_DIR, { recursive: true });
  console.log(`Storage: ${IS_BLOB ? 'VERCEL_BLOB' : 'LOCAL'}`);

  await dataSource.initialize();
  const templates = dataSource.getRepository(ProductTemplate);
  const images = dataSource.getRepository(ProductImage);

  // 1) Publish the single captioned tint sample once.
  const samplePaths: string[] = [await copyFile(SAMPLE_FILE, 'muestra-tinta')];
  console.log(`Published ${samplePaths.length} tint sample.`);

  const mapBySlug = new Map(MAP);

  const all = await templates.find({
    relations: { variations: { images: true } },
  });
  console.log(`Rebuilding images for ${all.length} templates…`);

  let withReal = 0;
  for (const tpl of all) {
    // Decide the product photos for this template.
    let productPaths: string[] = [];
    if (mapBySlug.has(tpl.slug)) {
      const nums = mapBySlug.get(tpl.slug)!;
      productPaths = await Promise.all(
        nums.map((num, i) => copyPhoto(num, `${tpl.slug}-${i + 1}`)),
      );
      withReal++;
    } else {
      // Keep the existing catalogue lámina (first non-sample image path).
      const existing = (tpl.variations || [])
        .flatMap((v) => v.images || [])
        .map((im) => im.path)
        .filter((p) => p && !p.includes('muestra-tinta'));
      productPaths = existing.length ? [existing[0]] : [];
    }

    for (const v of tpl.variations || []) {
      if (v.images?.length) await images.remove(v.images);
      const fresh: ProductImage[] = [];
      let sort = 0;
      productPaths.forEach((p, i) =>
        fresh.push(makeImage(p, i === 0, sort++, v.name)),
      );
      samplePaths.forEach((p) =>
        fresh.push(makeImage(p, false, sort++, 'Muestras de tinta disponibles')),
      );
      for (const img of fresh) img.variation = v;
      await images.save(fresh);
    }
  }

  console.log(
    `Done. ${withReal} products got real photos; samples appended to all.`,
  );
  await dataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
