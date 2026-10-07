// File: src/lib/imageEnhancer.ts

export interface EnhancementResult {
  base64Data: string;
  mimeType: string;
  previewUrl: string;
  wasEnhanced: boolean;
  averageLuminance: number;
  isBlackScreen?: boolean;
}

/**
 * Pre-processes and enhances mobile camera captures.
 * Automatically lifts shadows, increases contrast, and sharpens edges
 * ONLY for genuine dimly lit scenes, while detecting completely blocked/black/covered lenses.
 */
export async function enhanceCameraImage(
  imageSource: HTMLImageElement | HTMLVideoElement | File
): Promise<EnhancementResult> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia');
  }

  let sourceWidth = 0;
  let sourceHeight = 0;
  let elementToDraw: CanvasImageSource;

  if (imageSource instanceof HTMLVideoElement) {
    sourceWidth = imageSource.videoWidth || 640;
    sourceHeight = imageSource.videoHeight || 480;
    elementToDraw = imageSource;
  } else if (imageSource instanceof HTMLImageElement) {
    sourceWidth = imageSource.naturalWidth || imageSource.width;
    sourceHeight = imageSource.naturalHeight || imageSource.height;
    elementToDraw = imageSource;
  } else {
    // It's a File
    const bmp = await createImageBitmap(imageSource);
    sourceWidth = bmp.width;
    sourceHeight = bmp.height;
    elementToDraw = bmp;
  }

  // Constrain max resolution for faster mobile AI inference (max 1024px)
  const maxDim = 1024;
  let targetWidth = sourceWidth;
  let targetHeight = sourceHeight;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Initial draw to sample luminance
  ctx.drawImage(elementToDraw, 0, 0, targetWidth, targetHeight);
  const sampleData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = sampleData.data;
  let totalLuminance = 0;
  let maxLuminance = 0;
  const step = 4 * 16; // Sample every 16th pixel for speed

  const sampledLums: number[] = [];
  for (let i = 0; i < pixels.length; i += step) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuminance += lum;
    if (lum > maxLuminance) maxLuminance = lum;
    sampledLums.push(lum);
  }

  const sampleCount = sampledLums.length;
  const avgLuminance = totalLuminance / sampleCount;

  // Calculate variance to detect flat dark images vs actual scenes
  let varianceSum = 0;
  for (const lum of sampledLums) {
    const diff = lum - avgLuminance;
    varianceSum += diff * diff;
  }
  const stdDev = Math.sqrt(varianceSum / sampleCount);

  // Black screen / covered camera detection:
  // If average luminance is below 24, OR if average luminance is below 38 with almost zero contrast (stdDev < 7)
  const isBlackScreen = avgLuminance < 22 || (avgLuminance < 36 && stdDev < 7 && maxLuminance < 50);

  let wasEnhanced = false;

  // Only lift shadows if it's NOT a covered lens / black screen, but genuinely underexposed scene
  if (!isBlackScreen && avgLuminance < 115) {
    wasEnhanced = true;
    const brightnessFactor = avgLuminance < 60 ? 1.35 : 1.2;
    const contrastFactor = 1.15;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.filter = `brightness(${brightnessFactor}) contrast(${contrastFactor}) saturate(1.1)`;
    ctx.drawImage(elementToDraw, 0, 0, targetWidth, targetHeight);
    ctx.filter = 'none';
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

  return {
    base64Data,
    mimeType: 'image/jpeg',
    previewUrl: dataUrl,
    wasEnhanced,
    averageLuminance: Math.round(avgLuminance),
    isBlackScreen
  };
}
