const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  TableLayoutType,
  WidthType,
  AlignmentType,
  BorderStyle,
} = require("docx");
const sharp = require("sharp");

/**
 * Generate a Word document with custom badge images for printing
 * @param {Object} options
 * @param {string} options.orderId
 * @param {Array} options.customBadges
 * @returns {Promise<Buffer>}
 */
async function generateBadgeDoc({ orderId, customBadges }) {
  if (!customBadges || customBadges.length === 0) {
    return null;
  }

  /**
   * Convert base64 / dataURL → Buffer
   */
  const extractImageBuffer = (imageValue) => {
    if (!imageValue) return null;

    if (typeof imageValue === "string" && imageValue.startsWith("data:")) {
      const commaIndex = imageValue.indexOf(",");
      if (commaIndex < 0) return null;
      const data = imageValue.slice(commaIndex + 1).replace(/\s/g, "");

      try {
        const buffer = Buffer.from(data, "base64");
        return buffer.length ? buffer : null;
      } catch {
        return null;
      }
    }

    if (typeof imageValue === "string") {
      try {
        const buffer = Buffer.from(imageValue.replace(/\s/g, ""), "base64");
        return buffer.length ? buffer : null;
      } catch {
        return null;
      }
    }

    return null;
  };

  const DISPLAY_DPI = 96;

  const buildImageRun = async (imageSource, sizeMm) => {
    if (!imageSource || !imageSource.startsWith("data:image")) return null;

    const imageBuffer = extractImageBuffer(imageSource);
    if (!imageBuffer) throw new Error("Badge image buffer is empty");

    const px = Math.round((sizeMm / 25.4) * DISPLAY_DPI);

    // 1. Resize first
    const resized = await sharp(imageBuffer)
      .resize(px, px, { fit: "cover" })
      .png()
      .toBuffer();

    // 2. ALWAYS create perfect circle mask to ensure circular output
    const radius = px / 2;
    const centerX = radius;
    const centerY = radius;
    const maskBuffer = Buffer.alloc(px * px * 4, 0);

    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          const idx = (y * px + x) * 4;
          maskBuffer[idx + 3] = 255; // Alpha only
        }
      }
    }

    const maskPng = await sharp(maskBuffer, {
      raw: { width: px, height: px, channels: 4 },
    }).png().toBuffer();

    // 3. Composite with dest-in for circular crop
    const circular = await sharp(resized)
      .ensureAlpha()
      .composite([{
        input: maskPng,
        blend: "dest-in",
      }])
      .png()
      .toBuffer();

    return {
      data: Uint8Array.from(circular),
      width: px,
      height: px,
    };
  };

  const children = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "STICKTOON - Custom Badge Print Order",
          bold: true,
          size: 32,
          color: "3B82F6",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Order ID
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Order ID: ${orderId}`,
          bold: true,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Date
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Date: ${new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          size: 20,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Separator
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "━".repeat(50),
          color: "E5E7EB",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  /**
   * BADGES
   */
  for (let i = 0; i < customBadges.length; i++) {
    const badge = customBadges[i];

    // Badge header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Badge #${i + 1}: ${badge.name}`,
            bold: true,
            size: 28,
          }),
        ],
        spacing: { before: 300, after: 100 },
      })
    );

    // Quantity
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Quantity: ${badge.quantity} pcs`,
            size: 24,
            color: "10B981",
            bold: true,
          }),
        ],
        spacing: { after: 200 },
      })
    );

    const outerSource = badge.printImage || badge.image;
    const innerSource = badge.image;

    try {
      const outerImage = outerSource
        ? await buildImageRun(outerSource, 70)
        : null;
      const innerImage = innerSource
        ? await buildImageRun(innerSource, 58)
        : null;

      const noBorders = {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      };

      const labelRow = new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Badge Preview 1",
                    size: 18,
                    color: "6B7280",
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Badge Preview 2",
                    size: 18,
                    color: "6B7280",
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
        ],
      });

      const outerImageParagraph = outerImage
        ? new Paragraph({
            children: [
              new ImageRun({
                data: outerImage.data,
                transformation: {
                  width: outerImage.width,
                  height: outerImage.height,
                },
                type: "png",
              }),
            ],
            alignment: AlignmentType.CENTER,
          })
        : new Paragraph({
            children: [
              new TextRun({
                text: "[Outer image missing]",
                color: "EF4444",
                italics: true,
                size: 18,
              }),
            ],
            alignment: AlignmentType.CENTER,
          });

      const innerImageParagraph = innerImage
        ? new Paragraph({
            children: [
              new ImageRun({
                data: innerImage.data,
                transformation: {
                  width: innerImage.width,
                  height: innerImage.height,
                },
                type: "png",
              }),
            ],
            alignment: AlignmentType.CENTER,
          })
        : new Paragraph({
            children: [
              new TextRun({
                text: "[Inner image missing]",
                color: "EF4444",
                italics: true,
                size: 18,
              }),
            ],
            alignment: AlignmentType.CENTER,
          });

      const imageRow = new TableRow({
        children: [
          new TableCell({
            children: [outerImageParagraph],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
          new TableCell({
            children: [innerImageParagraph],
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorders,
          }),
        ],
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          columnWidths: [5000, 5000],
          rows: [labelRow, imageRow],
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "↑ Circular cropped badge images ready for printing",
              size: 18,
              color: "10B981",
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 150, after: 200 },
        })
      );

      if (badge.quantity > 1) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `⚠️ Print ${badge.quantity} copies of this badge`,
                size: 22,
                color: "F59E0B",
                bold: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          })
        );
      }
    } catch (imgErr) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[Image error: ${imgErr.message}]`,
              color: "EF4444",
              italics: true,
            }),
          ],
          spacing: { after: 300 },
        })
      );
    }

    if (i < customBadges.length - 1) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "─".repeat(40),
              color: "D1D5DB",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        })
      );
    }
  }

  // Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "━".repeat(50),
          color: "E5E7EB",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Total Custom Badges: ${customBadges.reduce(
            (sum, b) => sum + b.quantity,
            0
          )} pcs`,
          bold: true,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Generated by StickToon Order System",
          size: 16,
          color: "9CA3AF",
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

module.exports = generateBadgeDoc;
