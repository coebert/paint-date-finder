/**
 * Client-side image compression for the flyer importer.
 *
 * Goal: shrink large camera/phone photos before upload + AI extraction so
 * we stay well under timeouts. We resize to a max dimension and re-encode
 * as JPEG/WebP at a reasonable quality. PNGs with transparency keep PNG.
 *
 * No-op for tiny files, animated formats, or anything we can't decode.
 */

export type CompressOptions = {
  /** Max width or height in CSS pixels. Defaults to 1800. */
  maxDimension?: number;
  /** JPEG/WebP quality 0-1. Defaults to 0.82. */
  quality?: number;
  /**
   * Skip compression if the source file is already under this many bytes.
   * Defaults to 1.5 MB — small files don't benefit much.
   */
  skipBelowBytes?: number;
};

export type CompressionResult = {
  file: File;
  compressed: boolean;
  originalBytes: number;
  finalBytes: number;
  width?: number;
  height?: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1800,
  quality: 0.82,
  skipBelowBytes: 1.5 * 1024 * 1024,
};

function loadImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // Prefer createImageBitmap (faster, off-main-thread decode where supported).
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).catch(() => loadViaImg(file));
  }
  return loadViaImg(file);
}

function loadViaImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image'));
    };
    img.src = url;
  });
}

function getDims(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  if ('width' in src && 'height' in src) {
    return { w: (src as { width: number }).width, h: (src as { height: number }).height };
  }
  return { w: 0, h: 0 };
}

/**
 * Compress an image File client-side. Returns the original file untouched
 * if it's already small, isn't a supported raster image, or compression
 * would make it larger.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {},
): Promise<CompressionResult> {
  const opts = { ...DEFAULTS, ...options };
  const originalBytes = file.size;

  // Only handle JPEG/PNG/WebP. Skip GIFs (often animated), HEIC, SVG, etc.
  const isJpeg = /jpe?g/i.test(file.type) || /\.jpe?g$/i.test(file.name);
  const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
  const isWebp = file.type === 'image/webp' || /\.webp$/i.test(file.name);
  if (!isJpeg && !isPng && !isWebp) {
    return { file, compressed: false, originalBytes, finalBytes: originalBytes };
  }

  if (originalBytes <= opts.skipBelowBytes) {
    return { file, compressed: false, originalBytes, finalBytes: originalBytes };
  }

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await loadImageBitmap(file);
  } catch {
    return { file, compressed: false, originalBytes, finalBytes: originalBytes };
  }

  const { w, h } = getDims(bitmap);
  if (!w || !h) {
    return { file, compressed: false, originalBytes, finalBytes: originalBytes };
  }

  const scale = Math.min(1, opts.maxDimension / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  // If image is already small enough AND well under the size threshold check
  // already passed above, we still re-encode to compress JPEG quality.
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { file, compressed: false, originalBytes, finalBytes: originalBytes };
  }
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetW, targetH);

  // Keep PNG as PNG to preserve transparency; otherwise prefer JPEG.
  const outType = isPng ? 'image/png' : 'image/jpeg';
  const outExt = isPng ? 'png' : 'jpg';

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, outType, opts.quality),
  );
  if (!blob || blob.size >= originalBytes) {
    return {
      file,
      compressed: false,
      originalBytes,
      finalBytes: originalBytes,
      width: w,
      height: h,
    };
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'flyer';
  const compressed = new File([blob], `${baseName}.${outExt}`, {
    type: outType,
    lastModified: Date.now(),
  });

  return {
    file: compressed,
    compressed: true,
    originalBytes,
    finalBytes: compressed.size,
    width: targetW,
    height: targetH,
  };
}
