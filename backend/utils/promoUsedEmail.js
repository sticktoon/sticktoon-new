/**
 * Email template for notifying admin/influencer when their promo code is used
 * Supports both company promos and influencer affiliate promos
 */

const promoUsedEmailTemplate = ({
  promoCode,
  discountApplied,
  orderAmount,
  customerName,
  customerEmail,
  usedCount,
  usageLimit,
  orderId,
  // Influencer specific
  isInfluencer = false,
  totalUnits = 0,
  earningPerUnit = 5,
  earningGenerated = 0,
}) => {
  const usageText = usageLimit
    ? `${usedCount} / ${usageLimit}`
    : `${usedCount} (Unlimited)`;

  // Different header for influencer vs company promo
  const headerTitle = isInfluencer
    ? `You Earned Rs${earningGenerated}!`
    : `Promo Code Used!`;

  const headerBg = isInfluencer
    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
    : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";

  const messageText = isInfluencer
    ? `Great news! Someone used your promo code and you earned Rs${earningGenerated}!`
    : `Great news! Your promo code has just been used by a customer.`;

  // Influencer earning section
  const influencerSection = isInfluencer
    ? `
                    <!-- Earning Highlight -->
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
                      <p style="color: #d1fae5; font-size: 12px; margin: 0 0 5px; text-transform: uppercase; letter-spacing: 1px;">Your Earning</p>
                      <p style="color: #ffffff; font-size: 36px; font-weight: bold; margin: 0;">Rs${earningGenerated}</p>
                      <p style="color: #d1fae5; font-size: 14px; margin: 10px 0 0;">
                        ${totalUnits} units x Rs${earningPerUnit}/unit
                      </p>
                    </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: ${headerBg}; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                ${headerTitle}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              
              <!-- Promo Code Badge -->
              <div style="text-align: center; margin-bottom: 25px;">
                <span style="display: inline-block; background-color: ${isInfluencer ? "#d1fae5" : "#eef2ff"}; color: ${isInfluencer ? "#059669" : "#4f46e5"}; padding: 12px 24px; border-radius: 8px; font-family: monospace; font-size: 20px; font-weight: bold; letter-spacing: 2px;">
                  ${promoCode}
                </span>
              </div>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px; text-align: center;">
                ${messageText}
              </p>

              ${influencerSection}

              <!-- Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    
                    <!-- Customer Info -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; padding-bottom: 5px;">Customer</td>
                      </tr>
                      <tr>
                        <td style="color: #111827; font-size: 15px; font-weight: 600;">
                          ${customerName || "N/A"}
                          <span style="color: #6b7280; font-weight: normal;"> (${customerEmail})</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <div style="height: 1px; background-color: #e5e7eb; margin: 15px 0;"></div>

                    <!-- Order Details Grid -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding-right: 10px;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px;">Order Amount</p>
                          <p style="color: #111827; font-size: 18px; font-weight: bold; margin: 0;">Rs${orderAmount}</p>
                        </td>
                        <td width="50%" style="padding-left: 10px;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px;">Discount Given</p>
                          <p style="color: #ef4444; font-size: 18px; font-weight: bold; margin: 0;">-Rs${discountApplied}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <div style="height: 1px; background-color: #e5e7eb; margin: 15px 0;"></div>

                    <!-- Usage Stats -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding-right: 10px;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px;">Total Usage</p>
                          <p style="color: #4f46e5; font-size: 16px; font-weight: bold; margin: 0;">${usageText}</p>
                        </td>
                        <td width="50%" style="padding-left: 10px;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px;">${isInfluencer ? "Units Sold" : "Order ID"}</p>
                          <p style="color: #111827; font-size: ${isInfluencer ? "16px" : "12px"}; font-family: monospace; margin: 0; font-weight: ${isInfluencer ? "bold" : "normal"};">${isInfluencer ? totalUnits : orderId}</p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <a href="${process.env.FRONTEND_URL }/#/admin/promo" 
                       style="display: inline-block; background: ${headerBg}; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                      ${isInfluencer ? "View Your Earnings" : "View All Promos"}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ${isInfluencer ? "StickToon Affiliate Program" : "StickToon Admin"}<br>
                This is an automated message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

module.exports = promoUsedEmailTemplate;
