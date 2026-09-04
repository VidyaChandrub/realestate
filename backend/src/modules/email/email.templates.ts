export function getInviteEmailHtml(params: {
  recipientName?: string;
  orgName?: string;
  role: string;
  tempPassword?: string;
  loginUrl: string;
  customBody?: string;
}): string {
  const { recipientName, orgName, role, tempPassword, loginUrl, customBody } = params;
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
  const orgText = orgName ? `<strong>${orgName}</strong>` : 'your organization';

  let bodyContent = `<p>You have been invited to join ${orgText} on the <strong>iPixxel Realty</strong> platform as a <strong>${role}</strong>.</p>`;
  if (customBody) {
    bodyContent = customBody
      .replace(/{recipientName}/g, recipientName || 'there')
      .replace(/{orgName}/g, orgName || 'your organization')
      .replace(/{role}/g, role)
      .replace(/{loginUrl}/g, loginUrl)
      .replace(/\n/g, '<br/>');
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 28px 32px; text-align: left; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .content { padding: 32px; line-height: 1.6; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; margin: 20px 0; }
    .creds-box { background: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border: 1px dashed #cbd5e1; }
    .creds-box p { margin: 4px 0; font-size: 14px; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>iPixxel Realty</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px;">${greeting}</p>
      ${bodyContent}
      
      ${
        tempPassword
          ? `<div class="creds-box">
              <p><strong>Your Temporary Password:</strong> <code style="font-size:15px; color:#4338ca; font-weight:bold;">${tempPassword}</code></p>
              <p style="color:#64748b; font-size:13px;">You will be prompted to set a permanent password upon first signing in.</p>
             </div>`
          : ''
      }

      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn" target="_blank">Sign In to Your Account</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} iPixxel Realty. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
}

export function getResetPasswordEmailHtml(params: {
  recipientName?: string;
  resetUrl: string;
  customBody?: string;
}): string {
  const { recipientName, resetUrl, customBody } = params;
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';

  let bodyContent = `<p>We received a request to reset the password for your account. Click the button below to choose a new password.</p>`;
  if (customBody) {
    bodyContent = customBody
      .replace(/{recipientName}/g, recipientName || 'there')
      .replace(/{resetUrl}/g, resetUrl)
      .replace(/\n/g, '<br/>');
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 28px 32px; text-align: left; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .content { padding: 32px; line-height: 1.6; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; margin: 20px 0; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>iPixxel Realty</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px;">${greeting}</p>
      ${bodyContent}
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">This link will expire in 60 minutes. If you did not request a password reset, no further action is required and your account remains secure.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} iPixxel Realty. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
}

export function getTestEmailHtml(params: {
  sentAt: string;
  senderName: string;
  host: string;
}): string {
  const { sentAt, senderName, host } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SMTP Test Email</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #059669; padding: 28px 32px; text-align: left; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; }
    .content { padding: 32px; line-height: 1.6; }
    .badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; }
    .details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 13px; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ SMTP Connection Verified</h1>
    </div>
    <div class="content">
      <p><span class="badge">Success</span></p>
      <p style="font-size: 15px;">This is a test email sent from the <strong>iPixxel Realty Super Admin Console</strong> to verify your SMTP mail configuration.</p>
      <div class="details">
        <strong>SMTP Host:</strong> ${host}<br>
        <strong>Sender Name:</strong> ${senderName}<br>
        <strong>Timestamp:</strong> ${sentAt}
      </div>
      <p style="font-size: 13px; color: #64748b;">Your transactional email delivery pipeline is active and ready to deliver invites, notifications, and alerts.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} iPixxel Realty Platform.
    </div>
  </div>
</body>
</html>
`;
}
