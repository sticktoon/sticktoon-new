// Print-size guard: run with `node utils/generateBadgeDoc.test.js`
// Fails if the Word file stops placing badges at exactly 70mm / 58mm,
// or if the embedded artwork gets downsampled below print resolution.
const assert = require("assert");
const sharp = require("sharp");
const JSZip = require("jszip");
const generateBadgeDoc = require("./generateBadgeDoc");

const EMU_PER_MM = 36000;

const solidPng = async (px) =>
  `data:image/png;base64,${(
    await sharp({
      create: { width: px, height: px, channels: 4, background: "#b11494" },
    })
      .png()
      .toBuffer()
  ).toString("base64")}`;

(async () => {
  // What CustomOrder.tsx exports: 300 DPI circles for 70mm and 58mm
  const printImage = await solidPng(827);
  const image = await solidPng(685);

  const buffer = await generateBadgeDoc({
    orderId: "TEST-1",
    customBadges: [{ name: "Test", quantity: 1, image, printImage }],
  });
  assert.ok(buffer && buffer.length, "no document produced");

  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml").async("string");
  const extents = [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);

  assert.strictEqual(extents.length, 2, `expected 2 images, got ${extents.length}`);
  for (const [expectedMm, [cx, cy]] of [[70, extents[0]], [58, extents[1]]]) {
    assert.strictEqual(cx, expectedMm * EMU_PER_MM, `${expectedMm}mm width is ${cx / EMU_PER_MM}mm`);
    assert.strictEqual(cy, expectedMm * EMU_PER_MM, `${expectedMm}mm height is ${cy / EMU_PER_MM}mm`);
  }

  // Artwork must survive at source resolution, not be baked down to 96 DPI
  const media = zip.folder("word/media").file(/\.png$/);
  const sizes = (
    await Promise.all(media.map(async (f) => (await sharp(await f.async("nodebuffer")).metadata()).width))
  ).sort((a, b) => b - a);
  assert.deepStrictEqual(sizes, [827, 685], `artwork resized to ${sizes}`);

  // A small upload still exports an 827px canvas, so the warning has to come
  // from the designer's measured source DPI, not the file dimensions.
  const lowZip = await JSZip.loadAsync(
    await generateBadgeDoc({
      orderId: "TEST-2",
      customBadges: [{ name: "Low", quantity: 1, image, printImage, sourceDpi: 90 }],
    })
  );
  const lowXml = await lowZip.file("word/document.xml").async("string");
  assert.ok(lowXml.includes("LOW RESOLUTION"), "low source DPI was not flagged");
  assert.ok(!xml.includes("LOW RESOLUTION"), "300 DPI art wrongly flagged");

  // Artwork now lives on Cloudinary and the order carries a URL, so the document
  // has to be buildable from a link and not just from an inline data: URI.
  const raw = Buffer.from(printImage.split(",")[1], "base64");
  const host = require("http").createServer((_, res) => {
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(raw);
  });
  await new Promise((resolve) => host.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${host.address().port}/badge.png`;

  try {
    const hostedZip = await JSZip.loadAsync(
      await generateBadgeDoc({
        orderId: "TEST-3",
        customBadges: [{ name: "Hosted", quantity: 1, image: url, printImage: url }],
      })
    );
    const hostedXml = await hostedZip.file("word/document.xml").async("string");
    const hostedExtents = [...hostedXml.matchAll(/<wp:extent cx="(\d+)"/g)].map((m) => Number(m[1]));
    assert.deepStrictEqual(
      hostedExtents,
      [70 * EMU_PER_MM, 58 * EMU_PER_MM],
      "hosted artwork must print at the same sizes as an inline data: URI"
    );
  } finally {
    host.close();
  }

  console.log("ok — 70mm/58mm exact, 300 DPI kept, low-res flagged, hosted URLs work");
})();
