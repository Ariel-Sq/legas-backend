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

// Path-style (no query string) so Next.js image optimization accepts the
// URL — remotePatterns with an omitted `search` reject query strings.
export function publicImageUrl(image: ImageLike | undefined | null): string {
  if (!image) return '';
  if (image.path) {
    return `${BACKEND_URL}/api/images/${image.path}`;
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
