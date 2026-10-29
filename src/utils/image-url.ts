import { BACKEND_URL } from './environments';

interface ImageLike {
  url?: string;
  path?: string;
}

interface VariationLike {
  images?: ImageLike[];
}

interface HasVariations {
  productVariation?: VariationLike | null;
}

// With Vercel Blob the files live on a public CDN; serve them straight from
// it instead of proxying every byte through this (cold-startable) lambda,
// which was the cause of intermittent 400s and ~1s image loads. The
// /api/images route stays as a fallback for local storage.
const IS_BLOB = process.env.STORAGE_TYPE === 'VERCEL_BLOB';
const BLOB_PUBLIC_BASE = (
  process.env.BLOB_BASE_URL ||
  'https://vuc1kji60ug9rvd6.public.blob.vercel-storage.com'
).replace(/\/$/, '');

// Path-style (no query string) so Next.js image optimization accepts the
// URL — remotePatterns with an omitted `search` reject query strings.
export function publicImageUrl(image: ImageLike | undefined | null): string {
  if (!image) return '';
  if (image.path) {
    return IS_BLOB
      ? `${BLOB_PUBLIC_BASE}/${image.path}`
      : `${BACKEND_URL}/api/images/${image.path}`;
  }
  return image.url ?? '';
}

export function rewriteVariationImageUrls(
  variation: VariationLike | null | undefined,
): void {
  if (!variation?.images) return;
  for (const image of variation.images) {
    if (image.path) {
      image.url = publicImageUrl(image);
    }
  }
}

export function rewriteCartItemImageUrls<T extends HasVariations>(
  items: T[] | undefined,
): void {
  if (!items) return;
  for (const item of items) {
    rewriteVariationImageUrls(item.productVariation);
  }
}
