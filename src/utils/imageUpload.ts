export interface CompressedAvatarResult {
  ok: true;
  dataUrl: string;
  originalKb: number;
  compressedKb: number;
}

export interface CompressedAvatarError {
  ok: false;
  error: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_RAW_BYTES = 2 * 1024 * 1024; // 2.0 MB raw file limit
const MAX_DIMENSION_PX = 256;
const MAX_DATA_URL_CHARS = 150000; // ~110 KB binary, safe within Firestore 1 MB parish document

export async function compressAvatarImageFile(
  file: File
): Promise<CompressedAvatarResult | CompressedAvatarError> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: 'Invalid image format. Only JPEG, PNG, and WebP photographs are supported.',
    };
  }

  if (file.size > MAX_RAW_BYTES) {
    return {
      ok: false,
      error: `Photograph file size is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The maximum permitted size is 2.0 MB.`,
    };
  }

  const originalKb = Math.max(1, Math.round(file.size / 1024));

  try {
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read selected image file.'));
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not decode selected image file.'));
      image.src = rawDataUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      return { ok: false, error: 'Selected image has invalid dimensions.' };
    }

    const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { ok: false, error: 'Image processing is unavailable in this browser.' };
    }

    // Fill white backdrop for PNG/WebP transparency when converting to JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    }
    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      return {
        ok: false,
        error: 'Compressed photograph is still too large for profile storage. Please choose a smaller image or link an HTTPS URL.',
      };
    }

    const compressedKb = Math.max(1, Math.round((dataUrl.length * 3) / 4 / 1024));
    return {
      ok: true,
      dataUrl,
      originalKb,
      compressedKb,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Failed to process selected image file.',
    };
  }
}
