const IMG_RE = /^(https?:\/\/[^\s]+|data:image\/(?:png|jpe?g|gif|webp);base64,)/i;

export const isImageSrc = (src?: string | null): boolean =>
  !!src && IMG_RE.test(src);

export const nameInitials = (name?: string | null): string =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
