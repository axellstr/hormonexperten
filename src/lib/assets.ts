import type { ImageMetadata } from 'astro';

export const HERO_IMAGE_WIDTHS = [320, 480, 640, 960, 1200];
export const HERO_IMAGE_WIDTH = 1200;
export const HERO_IMAGE_HEIGHT = 1029;
export const HERO_IMAGE_SIZES = '(min-width: 1440px) 560px, (min-width: 1024px) 40vw, 80vw';

const images = import.meta.glob<ImageMetadata>('../assets/images/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
});

const logos = import.meta.glob<ImageMetadata>('../assets/logos/*.svg', {
  eager: true,
  import: 'default',
});

/** Resolve an image named in a content file (a file in src/assets/images/). */
export function getImage(file: string): ImageMetadata {
  const image = images[`../assets/images/${file}`];
  if (!image) throw new Error(`Unknown image "${file}": add it to src/assets/images/`);
  return image;
}

/** Resolve a partner or payment logo (a file in src/assets/logos/). */
export function getLogo(name: string): ImageMetadata {
  const logo = logos[`../assets/logos/${name}.svg`];
  if (!logo) throw new Error(`Unknown logo "${name}": add it to src/assets/logos/`);
  return logo;
}
