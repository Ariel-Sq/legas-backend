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

export function publicImageUrl(image: ImageLike | undefined | null): string {
  if (!image) return '';
  if (image.path) {
    return `${BACKEND_URL}/api/images?path=${image.path}`;
  }
  return image.url ?? '';
}

export function rewriteVariationImageUrls(
  variation: VariationLike | null | undefined,
): void {
  if (!variation?.images) return;
  for (const image of variation.images) {
    if (image.path) {
      image.url = `${BACKEND_URL}/api/images?path=${image.path}`;
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
