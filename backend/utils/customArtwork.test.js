// Custom-item detection guard: run with `node utils/customArtwork.test.js`
// The print document is only generated for items this says are custom, so a
// false negative here means a factory order goes out with no artwork attached.
const assert = require("assert");
const { isCustomItem, isDataUri, publicName } = require("./customArtwork");

const artwork = "data:image/png;base64,iVBORw0KGgo=";
const hosted = "https://res.cloudinary.com/x/image/upload/v1/custom-orders/custom-177-image-abc.png";

// After the artwork moves to Cloudinary the data: URI is gone. The badgeId is
// what has to keep the item recognisable - this is the case that broke before.
assert.ok(isCustomItem({ badgeId: "custom-1770820084748", image: hosted, printImage: hosted }));
assert.ok(isCustomItem({ badgeId: "custom-1770820084748", image: null, printImage: null }));

// Orders placed before the badgeId convention are still caught by their blob.
assert.ok(isCustomItem({ badgeId: "legacy-99", image: artwork }));
assert.ok(isCustomItem({ badgeId: null, printImage: artwork }));

// Catalog products must not be dragged into the print document.
assert.ok(!isCustomItem({ badgeId: "68f1a2b3c4d5e6f7a8b9c0d1", image: "/badge/Dogs.png" }));
assert.ok(!isCustomItem({}));
assert.ok(!isCustomItem(null));

assert.ok(isDataUri(artwork));
assert.ok(!isDataUri(hosted));
assert.ok(!isDataUri(null));

// Cloudinary cuts public_id at the first dot and we pass overwrite:true, so a
// name that collides or contains a dot would destroy another order's artwork.
const a = publicName("custom-1770820084748", "image");
const b = publicName("custom-1770820084748", "image");
assert.notStrictEqual(a, b, "two uploads must never share a public_id");
assert.ok(!a.includes("."), `public_id must not contain a dot: ${a}`);
assert.ok(!publicName("../../etc/passwd.png", "image").includes("."));
assert.ok(publicName(null, "printImage").startsWith("custom-printImage-"));

console.log("customArtwork ok");
