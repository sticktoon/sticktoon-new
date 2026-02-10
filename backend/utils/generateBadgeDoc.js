const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
} = require("docx");

/**
 * Generate a Word document with custom badge images for printing
 * @param {Object} options - Order details
 * @param {string} options.orderId - Order ID
 * @param {Array} options.customBadges - Array of custom badge items with image, name, quantity
 * @returns {Promise<Buffer>} - Word document as buffer
 */
async function generateBadgeDoc({ orderId, customBadges }) {
  if (!customBadges || customBadges.length === 0) {
    return null;
  }

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

  // Process each custom badge
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

    // Add badge image if it's a base64 data URL
    if (badge.image && badge.image.startsWith("data:image")) {
      try {
        // Extract base64 data from data URL
        const base64Data = badge.image.split(",")[1];
        const imageBuffer = Buffer.from(base64Data, "base64");

        // 70mm = 2.756 inches = 198.4 pixels at 72 DPI
        // For Word, we use EMUs (English Metric Units)
        // 70mm = 2520000 EMUs (1 inch = 914400 EMUs, 70mm = 2.756 inches)
        const badgeSizeMM = 70;
        const sizeEMU = Math.round((badgeSizeMM / 25.4) * 914400);

        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: {
                  width: sizeEMU,
                  height: sizeEMU,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );

        // Print size note
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `↑ Print at 58mm diameter (final badge size)`,
                size: 18,
                color: "EF4444",
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          })
        );

        // Note about quantity
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
        console.error("Error adding image to doc:", imgErr.message);
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "[Image could not be processed]",
                color: "EF4444",
                italics: true,
              }),
            ],
            spacing: { after: 300 },
          })
        );
      }
    }

    // Separator between badges
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
          text: `Total Custom Badges: ${customBadges.reduce((sum, b) => sum + b.quantity, 0)} pcs`,
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

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

module.exports = generateBadgeDoc;
