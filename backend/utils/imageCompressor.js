const sharp = require("sharp");

/**
 * Compress an image buffer or file path using Sharp.
 * - Resizes max width/height to 1200px (maintains aspect ratio, no upscaling)
 * - Converts suitable images to WebP at quality 80
 * - Falls back safely to original buffer if compression fails or format is unsupported
 * 
 * @param {Buffer|string} fileSource - Input image buffer or file path
 * @param {Object} options - Custom options (maxDimension, quality, format)
 * @returns {Promise<{ buffer: Buffer, contentType: string, extension: string, isCompressed: boolean }>}
 */
async function compressImageBuffer(fileSource, options = {}) {
  const {
    maxDimension = 1200,
    quality = 80,
    format = "webp",
  } = options;

  try {
    const inputBuffer = typeof fileSource === "string" 
      ? require("fs").readFileSync(fileSource)
      : fileSource;

    if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) {
      return { buffer: inputBuffer, contentType: "image/jpeg", extension: "jpg", isCompressed: false };
    }

    const metadata = await sharp(inputBuffer).metadata();
    
    // SVG files should not be rasterized/compressed as WebP
    if (metadata.format === "svg") {
      return { buffer: inputBuffer, contentType: "image/svg+xml", extension: "svg", isCompressed: false };
    }

    let pipeline = sharp(inputBuffer).rotate(); // auto-rotate based on EXIF orientation

    // Only resize if image width or height exceeds maxDimension
    if ((metadata.width && metadata.width > maxDimension) || (metadata.height && metadata.height > maxDimension)) {
      pipeline = pipeline.resize({
        width: maxDimension,
        height: maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to WebP format with given quality
    if (format === "webp") {
      pipeline = pipeline.webp({ quality, effort: 4 });
    } else if (format === "jpeg" || format === "jpg") {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else if (format === "png") {
      pipeline = pipeline.png({ quality, compressionLevel: 8 });
    }

    const compressedBuffer = await pipeline.toBuffer();

    console.log(
      `⚡ [Sharp] Image compressed (${metadata.format || "raw"} -> ${format}): ` +
      `${(inputBuffer.length / 1024).toFixed(1)} KB -> ${(compressedBuffer.length / 1024).toFixed(1)} KB ` +
      `(${(metadata.width || 0)}x${(metadata.height || 0)})`
    );

    return {
      buffer: compressedBuffer,
      contentType: `image/${format}`,
      extension: format,
      isCompressed: true,
    };
  } catch (err) {
    console.warn("⚠️ [Sharp] Image compression fallback to original:", err.message);
    const fallbackBuffer = typeof fileSource === "string" ? require("fs").readFileSync(fileSource) : fileSource;
    return {
      buffer: fallbackBuffer,
      contentType: "image/jpeg",
      extension: "jpg",
      isCompressed: false,
    };
  }
}

module.exports = {
  compressImageBuffer,
};
