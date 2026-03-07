export const otpEmailTemplate = (name: string, otp: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your CallShot account</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #111111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { background-color: #111111; padding: 40px 16px; }
    .card { background-color: #1E1E1E; border: 1px solid #2F2F2F; border-radius: 16px; max-width: 480px; margin: 0 auto; overflow: hidden; }
    .header { background-color: #1C1C1C; padding: 28px 32px; border-bottom: 1px solid #2F2F2F; text-align: center; }
    .logo-text { font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }
    .logo-text span { color: #FF6800; }
    .tagline { font-size: 12px; color: #666666; margin-top: 4px; }
    .body { padding: 32px; }
    .greeting { font-size: 18px; font-weight: 600; color: #FFFFFF; margin-bottom: 12px; }
    .message { font-size: 14px; color: #999999; line-height: 1.6; margin-bottom: 28px; }
    .otp-label { font-size: 11px; font-weight: 600; color: #FF6800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
    .otp-box { background-color: #111111; border: 1px solid #2F2F2F; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 12px; }
    .otp-code { font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #FF6800; font-variant-numeric: tabular-nums; }
    .expiry { font-size: 12px; color: #555555; text-align: center; margin-bottom: 28px; }
    .divider { border: none; border-top: 1px solid #2F2F2F; margin: 24px 0; }
    .warning { font-size: 12px; color: #555555; line-height: 1.6; }
    .warning strong { color: #888888; }
    .footer { background-color: #161616; border-top: 1px solid #2F2F2F; padding: 20px 32px; text-align: center; }
    .footer-text { font-size: 11px; color: #444444; line-height: 1.6; }
    .footer-brand { color: #FF6800; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">

      <!-- Header -->
      <div class="header">
        <div class="logo-text">Call<span>Shot</span></div>
        <div class="tagline">Predict Bold. Play Smart.</div>
      </div>

      <!-- Body -->
      <div class="body">
        <p class="greeting">Hey ${name.split(' ')[0]}, verify your email</p>
        <p class="message">
          Thanks for signing up for CallShot! Use the OTP below to verify your email address and start predicting.
        </p>

        <p class="otp-label">Your verification code</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p class="expiry">This code expires in <strong style="color:#888">15 minutes</strong></p>

        <hr class="divider" />

        <p class="warning">
          <strong>Didn't create a CallShot account?</strong><br />
          You can safely ignore this email. No account will be created without verification.
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">
          &copy; ${new Date().getFullYear()} <span class="footer-brand">CallShot</span> · Cricket prediction, done right.<br />
          This is an automated email, please do not reply.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
`;
