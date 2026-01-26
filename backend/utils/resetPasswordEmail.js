module.exports.resetPasswordEmail = ({ resetLink }) => {
  return `
  <!DOCTYPE html>
  <html>
    <body style="
      margin:0;
      padding:0;
      background:#0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:40px 16px;">
            <table width="100%" style="
              max-width:420px;
              background:#020617;
              border-radius:22px;
              padding:36px 28px;
              color:#fff;
            ">
              <tr>
                <td align="center">
                  <div style="
                    width:44px;
                    height:44px;
                    background:#2563eb;
                    border-radius:50%;
                    margin-bottom:16px;
                    line-height:44px;
                    font-size:26px;
                  ">+</div>

                  <h2 style="margin:0 0 12px;font-weight:800;">
                    Reset your StickToon password
                  </h2>

                  <p style="font-size:14px;color:#cbd5f5;line-height:1.6;">
                    You requested a password reset. Click below to set a new password.
                  </p>

                  <a href="${resetLink}" style="
                    display:inline-block;
                    margin-top:20px;
                    padding:14px 28px;
                    background:#2563eb;
                    color:#fff;
                    text-decoration:none;
                    border-radius:14px;
                    font-weight:800;
                  ">
                    Reset Password
                  </a>

                  <p style="font-size:12px;color:#94a3b8;margin-top:20px;">
                    This link expires in 15 minutes.
                  </p>

                  <p style="font-size:11px;color:#475569;margin-top:26px;">
                    © 2026 StickToon
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
