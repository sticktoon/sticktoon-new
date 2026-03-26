const axios = require("axios");
const path = require("path");

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function sanitizeFilenamePart(value) {
  return String(value || "badge")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "badge";
}

function normalizeImageUrl(imagePath, frontendUrl) {
  if (!imagePath || typeof imagePath !== "string") return null;

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  if (!frontendUrl) return null;

  if (imagePath.startsWith("/")) {
    return `${frontendUrl}${imagePath}`;
  }

  return `${frontendUrl}/${imagePath}`;
}

async function fetchImageAsAttachment({ url, fallbackName, index }) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      maxRedirects: 3,
    });

    const contentType = (response.headers["content-type"] || "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    let ext = MIME_TO_EXT[contentType] || null;
    if (!ext) {
      const urlPath = new URL(url).pathname;
      const guessed = path.extname(urlPath).replace(".", "").toLowerCase();
      ext = guessed || "jpg";
    }

    const safeBase = sanitizeFilenamePart(fallbackName);

    return {
      name: `badge-${String(index + 1).padStart(2, "0")}-${safeBase}.${ext}`,
      content: Buffer.from(response.data).toString("base64"),
    };
  } catch (err) {
    console.warn("Failed to fetch badge image for admin attachment:", url, err.message);
    return null;
  }
}

module.exports = async function buildAdminOrderAttachments({
  order,
  invoiceNumber,
  invoicePdfBuffer,
  badgeDocBuffer,
  frontendUrl,
}) {
  const attachments = [];

  if (invoicePdfBuffer) {
    attachments.push({
      name: `Invoice-${invoiceNumber}.pdf`,
      content: invoicePdfBuffer.toString("base64"),
    });
  }

  if (badgeDocBuffer) {
    attachments.push({
      name: `CustomBadges-Order-${order._id.toString().slice(-8).toUpperCase()}.docx`,
      content: badgeDocBuffer.toString("base64"),
    });
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return attachments;

  const imageTasks = items
    .map((item, index) => ({
      url: normalizeImageUrl(item?.image, frontendUrl),
      fallbackName: item?.name || item?.badgeId || "badge",
      index,
    }))
    .filter((item) => Boolean(item.url))
    .map((item) => fetchImageAsAttachment(item));

  if (!imageTasks.length) return attachments;

  const imageAttachments = await Promise.all(imageTasks);
  const validImages = imageAttachments.filter(Boolean);

  return attachments.concat(validImages);
};
