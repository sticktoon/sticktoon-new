// Custom-order artwork arrives from the browser as a base64 data: URI. Left as
// it is, it gets stored inline on the order document - up to half a megabyte per
// badge - and is then carried by every order query, every admin email and every
// backup, forever. Push it to Cloudinary and keep the URL instead.
const { uploadToCloudinary } = require("./cloudinaryService");

const ARTWORK_FIELDS = ["image", "printImage"];
const FOLDER = "custom-orders";

const isDataUri = (value) => typeof value === "string" && value.startsWith("data:image");

/**
 * Whether an order item is customer-supplied artwork rather than a catalog product.
 *
 * The cart marks these with a `custom-<timestamp>` badgeId; the inline data: URI
 * is only a fallback for anything that predates that. Recognising a custom item
 * *by* its data: URI is what breaks the moment the artwork moves to Cloudinary -
 * the print document then silently comes out empty - so the badgeId leads.
 */
const isCustomItem = (item) =>
  String(item?.badgeId || "").startsWith("custom-") ||
  isDataUri(item?.printImage) ||
  isDataUri(item?.image);

/* Cloudinary builds the public_id from this and cuts it at the first dot, so
   keep it to characters that survive that. Unique per upload: two custom orders
   sharing a public_id would overwrite each other's artwork. */
const publicName = (badgeId, field) => {
  const base = String(badgeId || "custom").replace(/[^a-zA-Z0-9_-]/g, "") || "custom";
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${base}-${field}-${unique}`;
};

/**
 * Replace every inline data: URI in an order's items with a Cloudinary URL.
 * Mutates and returns the same array.
 *
 * A failed upload keeps the inline copy. Losing the customer's artwork, or
 * failing their checkout because Cloudinary is unreachable, are both worse
 * outcomes than one fat document - and backupCsv still keeps such a blob out
 * of the CSVs either way.
 *
 * ponytail: uploads at order creation, so artwork for an abandoned unpaid order
 * is orphaned in Cloudinary. Sweep those on a schedule only if the folder grows.
 */
const uploadCustomArtwork = async (items) => {
  for (const item of items || []) {
    for (const field of ARTWORK_FIELDS) {
      if (!isDataUri(item[field])) continue;

      try {
        const { url } = await uploadToCloudinary(item[field], FOLDER, publicName(item.badgeId, field));
        item[field] = url;
      } catch (err) {
        console.error(`❌ Custom artwork upload failed (${field}), keeping inline copy:`, err.message);
      }
    }
  }

  return items;
};

module.exports = {
  uploadCustomArtwork,
  isCustomItem,
  isDataUri,
  ARTWORK_FIELDS,
  FOLDER,
  publicName,
};
