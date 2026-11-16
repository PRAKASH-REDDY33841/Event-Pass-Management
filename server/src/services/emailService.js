const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateQrBuffer, generateQrDataUrl } = require('./qrService');

let transporter = null;
let isEthereal = false;

async function getTransporter() {
  if (transporter) return transporter;

  // Check if real SMTP or Resend/SendGrid is configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Fallback: Create test ethereal account or simulate delivery
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isEthereal = true;
    console.log(`[EmailService] Using Ethereal test mailer (User: ${testAccount.user})`);
    return transporter;
  } catch (err) {
    console.warn('[EmailService] Failed to create Ethereal account, using mock delivery logger:', err.message);
    transporter = {
      sendMail: async (mailOptions) => {
        return { messageId: 'mock-' + Date.now(), response: 'Mock email logged to outbox' };
      },
    };
    return transporter;
  }
}

/**
 * Build rich HTML email template for the ticket
 */
function buildTicketEmailHtml({ event, ticket, qrDataUrl, passUrl }) {
  const formattedDate = new Date(event.start_date).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const currCode = (event.currency || ticket.currency || 'INR').toUpperCase();
  const currSym = currCode === 'INR' ? '₹' : (currCode === 'EUR' ? '€' : (currCode === 'GBP' ? '£' : (currCode === 'AED' ? 'AED ' : (currCode === 'JPY' ? '¥' : '$'))));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Pass for ${event.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; color: #e0e7ff; font-size: 14px; }
    .ticket-body { padding: 32px 28px; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(99, 102, 241, 0.2); border: 1px solid #6366f1; border-radius: 9999px; color: #a5b4fc; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .event-title { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px; }
    .meta-grid { background: #0f172a; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #1e293b; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #94a3b8; font-weight: 500; }
    .meta-value { color: #f1f5f9; font-weight: 600; text-align: right; }
    .qr-container { text-align: center; background: #ffffff; padding: 24px; border-radius: 16px; margin: 24px auto; max-width: 260px; box-shadow: 0 4px 14px rgba(0,0,0,0.2); }
    .qr-image { width: 220px; height: 220px; display: block; margin: 0 auto; }
    .code-display { font-family: monospace; font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 12px; letter-spacing: 2px; }
    .security-notice { font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 24px; line-height: 1.5; }
    .button-container { text-align: center; margin: 28px 0 12px; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; text-decoration: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
    .footer { border-top: 1px solid #1e293b; padding: 20px; text-align: center; font-size: 12px; color: #64748b; background: #0c1222; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p style="text-transform: uppercase; letter-spacing: 2px; font-weight: 700; font-size: 11px; margin-bottom: 6px; opacity: 0.9;">Official Admission Ticket</p>
      <h1>You're Registered!</h1>
      <p>Present the QR code below at the venue entrance</p>
    </div>
    <div class="ticket-body">
      <span class="badge">${ticket.tier_name || 'Attendee'} Pass</span>
      <h2 class="event-title">${event.title}</h2>
      
      <div class="meta-grid">
        <div class="meta-row">
          <span class="meta-label">Attendee Name:</span>
          <span class="meta-value">${ticket.attendee_name}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Ticket Code:</span>
          <span class="meta-value">${ticket.ticket_code}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Date & Time:</span>
          <span class="meta-value">${formattedDate}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Venue:</span>
          <span class="meta-value">${event.venue_name}, ${event.location}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Assigned Seat:</span>
          <span class="meta-value" style="color: #38bdf8; font-weight: 700;">Seat ${ticket.seat_number || 'General Entry'}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Payment Status:</span>
          <span class="meta-value" style="color: #34d399; font-weight: 700;">${ticket.payment_amount > 0 ? currSym + Number(ticket.payment_amount).toFixed(2) + ' (PAID via ' + (ticket.payment_method || 'CARD') + ')' : 'FREE STUDENT ADMISSION'}</span>
        </div>
      </div>

      <div class="qr-container">
        <img src="${qrDataUrl || 'cid:ticket_qr_code'}" alt="Secure Ticket QR Code" class="qr-image" />
        <div class="code-display">${ticket.ticket_code}</div>
      </div>

      <p class="security-notice">
        🔒 <strong>Cryptographically Signed:</strong> This QR code contains a verified digital signature. It can only be scanned once at the entrance door and cannot be duplicated or forged.
      </p>

      <div class="button-container">
        <a href="${passUrl}" class="btn" target="_blank">View / Add to Digital Wallet</a>
      </div>
    </div>
    <div class="footer">
      <p>Powered by EventPass Security Engine • Non-transferable ticket • Need help? Contact the organizer.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send ticket email to attendee and log into outbox
 */
async function sendTicketEmail({ event, ticket, passUrl }) {
  try {
    const mailer = await getTransporter();
    const qrBuffer = await generateQrBuffer(ticket.jwt_token);
    const qrDataUrl = await generateQrDataUrl(ticket.jwt_token);
    const htmlContent = buildTicketEmailHtml({ event, ticket, qrDataUrl, passUrl });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"EventPass Ticketing" <passes@eventpass.local>',
      to: `${ticket.attendee_name} <${ticket.attendee_email}>`,
      subject: `🎟️ Your Ticket for ${event.title} [${ticket.ticket_code}]`,
      html: htmlContent,
      attachments: [
        {
          filename: `ticket-${ticket.ticket_code}.png`,
          content: qrBuffer,
          cid: 'ticket_qr_code',
        },
      ],
    };

    const info = await mailer.sendMail(mailOptions);
    let previewUrl = null;
    if (nodemailer.getTestMessageUrl && info) {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    }

    // Save record to email_outbox table
    const outboxId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO email_outbox (id, ticket_id, to_email, to_name, subject, html_content, status, preview_url, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(outboxId, ticket.id, ticket.attendee_email, ticket.attendee_name, mailOptions.subject, htmlContent, 'SENT', previewUrl);

    console.log(`[EmailService] Ticket email sent to ${ticket.attendee_email} for ${ticket.ticket_code}. Preview: ${previewUrl || 'Logged to Outbox'}`);
    return { success: true, previewUrl, outboxId };
  } catch (err) {
    console.error('[EmailService] Failed to send ticket email:', err);
    // Still record in outbox as FAILED
    try {
      const outboxId = uuidv4();
      const qrDataUrl = await generateQrDataUrl(ticket.jwt_token).catch(() => '');
      const htmlContent = buildTicketEmailHtml({ event, ticket, qrDataUrl, passUrl });
      const stmt = db.prepare(`
        INSERT INTO email_outbox (id, ticket_id, to_email, to_name, subject, html_content, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      stmt.run(outboxId, ticket.id, ticket.attendee_email, ticket.attendee_name, `🎟️ Your Ticket for ${event.title} [${ticket.ticket_code}]`, htmlContent, 'FAILED');
    } catch (ignore) {}
    return { success: false, error: err.message };
  }
}

/**
 * Build rich HTML email template for Organizer Password Reset
 */
function buildPasswordResetEmailHtml({ organizer, user, otpCode, validMinutes = 15, userType = 'ORGANIZER' }) {
  const target = user || organizer || {};
  const isAttendee = userType === 'ATTENDEE' || !target.organization;
  const roleTitle = isAttendee ? 'Attendee Account' : 'Organizer Account';
  const orgText = target.organization ? ` (${target.organization})` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 540px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #8b5cf6 100%); padding: 30px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; color: #e0e7ff; font-size: 13px; }
    .body-content { padding: 32px 28px; }
    .greeting { font-size: 15px; color: #cbd5e1; margin-bottom: 16px; }
    .desc { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { text-align: center; background: #0f172a; border: 2px dashed #6366f1; border-radius: 12px; padding: 24px 16px; margin: 24px 0; }
    .otp-label { font-size: 11px; font-weight: 700; color: #818cf8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
    .otp-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; color: #38bdf8; letter-spacing: 8px; }
    .expiry { font-size: 12px; color: #94a3b8; margin-top: 10px; }
    .security-callout { background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 4px; padding: 12px 14px; font-size: 12px; color: #fca5a5; line-height: 1.5; margin: 20px 0; }
    .footer { border-top: 1px solid #1e293b; padding: 18px; text-align: center; font-size: 12px; color: #64748b; background: #0c1222; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p style="text-transform: uppercase; letter-spacing: 2px; font-weight: 700; font-size: 10px; margin-bottom: 4px; opacity: 0.9;">EventPass Security Center</p>
      <h1>Password Recovery Request</h1>
      <p>Secure verification code for your ${roleTitle}</p>
    </div>
    <div class="body-content">
      <p class="greeting">Hello <strong>${target.name || 'User'}</strong>,</p>
      <p class="desc">
        We received a request to reset the password for your ${roleTitle}${orgText} associated with <code>${target.email}</code>.
      </p>
      
      <div class="otp-box">
        <div class="otp-label">Your 6-Digit Verification Code</div>
        <div class="otp-code">${otpCode}</div>
        <div class="expiry">Valid for <strong>${validMinutes} minutes</strong> only.</div>
      </div>

      <div class="security-callout">
        <strong>Security Notice:</strong> If you did not initiate this request, someone may have entered your email address by mistake. Your account remains secure, and no password changes will take effect without this code.
      </div>
    </div>
    <div class="footer">
      EventPass Cryptographic Security Engine &bull; Automated System Dispatch
    </div>
  </div>
</body>
</html>
  `;
}

async function sendPasswordResetEmail({ organizer, user, otpCode, validMinutes = 15, userType = 'ORGANIZER' }) {
  const target = user || organizer || {};
  try {
    const mailer = await getTransporter();
    const htmlContent = buildPasswordResetEmailHtml({ organizer, user: target, otpCode, validMinutes, userType });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"EventPass Security" <security@eventpass.local>',
      to: `${target.name || 'User'} <${target.email}>`,
      subject: `🔑 EventPass Password Reset Code: ${otpCode}`,
      html: htmlContent,
    };

    const info = await mailer.sendMail(mailOptions);
    let previewUrl = null;
    if (nodemailer.getTestMessageUrl && info) {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    }

    // Save record to email_outbox table
    const outboxId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO email_outbox (id, ticket_id, to_email, to_name, subject, html_content, status, preview_url, sent_at)
      VALUES (?, NULL, ?, ?, ?, ?, 'SENT', ?, datetime('now'))
    `);
    stmt.run(outboxId, target.email, target.name || 'User', mailOptions.subject, htmlContent, previewUrl);

    console.log(`[EmailService] Password reset email dispatched to ${target.email} (${userType}). Preview: ${previewUrl || 'Logged to Outbox'}`);
    return { success: true, previewUrl, outboxId };
  } catch (err) {
    console.error('[EmailService] Failed to send password reset email:', err);
    try {
      const outboxId = uuidv4();
      const htmlContent = buildPasswordResetEmailHtml({ organizer, user: target, otpCode, validMinutes, userType });
      const stmt = db.prepare(`
        INSERT INTO email_outbox (id, ticket_id, to_email, to_name, subject, html_content, status, sent_at)
        VALUES (?, NULL, ?, ?, ?, ?, 'FAILED', datetime('now'))
      `);
      stmt.run(outboxId, target.email, target.name || 'User', `🔑 EventPass Password Reset Code: ${otpCode}`, htmlContent);
    } catch (ignore) {}
    return { success: false, error: err.message };
  }
}

/**
 * Build rich HTML email template for Event Cancellation & Student Refund
 */
function buildCancellationRefundEmailHtml({ event, ticket, refundAmount, refundTxnId, reason }) {
  const isPaid = refundAmount > 0;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Cancelled — Refund Notice</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ea580c 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; color: #fee2e2; font-size: 14px; }
    .body-content { padding: 32px 28px; }
    .greeting { font-size: 15px; color: #cbd5e1; margin-bottom: 16px; }
    .desc { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .refund-box { background: rgba(220, 38, 38, 0.1); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 14px; padding: 20px; margin: 24px 0; text-align: center; }
    .refund-label { font-size: 11px; font-weight: 700; color: #f87171; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
    .refund-amount { font-size: 32px; font-weight: 900; color: #4ade80; margin-bottom: 8px; }
    .refund-sub { font-size: 12px; color: #cbd5e1; }
    .meta-grid { background: #0f172a; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #1e293b; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #94a3b8; font-weight: 500; }
    .meta-value { color: #f1f5f9; font-weight: 600; text-align: right; }
    .reason-box { background: rgba(15, 23, 42, 0.8); border-left: 4px solid #f59e0b; padding: 14px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #e2e8f0; }
    .footer { border-top: 1px solid #1e293b; padding: 18px; text-align: center; font-size: 12px; color: #64748b; background: #0c1222; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p style="text-transform: uppercase; letter-spacing: 2px; font-weight: 700; font-size: 10px; margin-bottom: 4px; opacity: 0.95;">Official Notice &bull; Event Cancellation</p>
      <h1>Event Cancelled & ${isPaid ? '100% Refund Issued' : 'Pass Cancelled'}</h1>
      <p>Automatic payment reversal notification</p>
    </div>
    <div class="body-content">
      <p class="greeting">Dear <strong>${ticket.attendee_name}</strong>,</p>
      <p class="desc">
        We regret to inform you that the event <strong>"${event.title}"</strong> has been cancelled by the event organizers. 
        ${isPaid ? 'A <strong>100% full refund</strong> has been automatically credited back to your original payment method.' : 'Your registered pass has been cancelled.'}
      </p>

      ${isPaid ? `
      <div class="refund-box">
        <div class="refund-label">Total Refund Processed</div>
        <div class="refund-amount">$${Number(refundAmount).toFixed(2)} USD</div>
        <div class="refund-sub">Status: <strong>PROCESSED &bull; CREDITED TO ORIGINAL PAYMENT</strong></div>
      </div>
      ` : ''}

      <div class="meta-grid">
        <div class="meta-row">
          <span class="meta-label">Event:</span>
          <span class="meta-value">${event.title}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Ticket Code:</span>
          <span class="meta-value" style="font-family: monospace;">${ticket.ticket_code}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Assigned Seat:</span>
          <span class="meta-value">Seat ${ticket.seat_number || 'General Entry'}</span>
        </div>
        ${isPaid ? `
        <div class="meta-row">
          <span class="meta-label">Refund Reference ID:</span>
          <span class="meta-value" style="font-family: monospace; color: #38bdf8;">${refundTxnId}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Original Payment:</span>
          <span class="meta-value">$${Number(ticket.payment_amount).toFixed(2)} via ${ticket.payment_method || 'CARD'}</span>
        </div>
        ` : ''}
      </div>

      ${reason ? `
      <div class="reason-box">
        <strong>Organizer Note:</strong> ${reason}
      </div>
      ` : ''}

      <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
        You do not need to take any action. The digital pass QR code has been safely invalidated in the entrance security reticle.
      </p>
    </div>
    <div class="footer">
      EventPass Security & Billing Automation &bull; Automated System Dispatch
    </div>
  </div>
</body>
</html>
  `;
}

async function sendCancellationRefundEmail({ event, ticket, refundAmount, refundTxnId, reason }) {
  try {
    const mailer = await getTransporter();
    const htmlContent = buildCancellationRefundEmailHtml({ event, ticket, refundAmount, refundTxnId, reason });
    const isPaid = refundAmount > 0;

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"EventPass Billing" <refunds@eventpass.local>',
      to: `${ticket.attendee_name} <${ticket.attendee_email}>`,
      subject: `⚠️ Event Cancelled: ${isPaid ? `100% Refund of $${Number(refundAmount).toFixed(2)} Processed` : 'Pass Cancelled'} [${event.title}]`,
      html: htmlContent,
    };

    const info = await mailer.sendMail(mailOptions);
    let previewUrl = null;
    if (nodemailer.getTestMessageUrl && info) {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    }

    const outboxId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO email_outbox (id, ticket_id, to_email, to_name, subject, html_content, status, preview_url, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?, datetime('now'))
    `);
    stmt.run(outboxId, ticket.id, ticket.attendee_email, ticket.attendee_name, mailOptions.subject, htmlContent, previewUrl);

    console.log(`[EmailService] Cancellation & refund email sent to ${ticket.attendee_email} for ${ticket.ticket_code}. Preview: ${previewUrl || 'Logged to Outbox'}`);
    return { success: true, previewUrl, outboxId };
  } catch (err) {
    console.error('[EmailService] Failed to send cancellation refund email:', err);
    try {
      const outboxId = uuidv4();
      const htmlContent = buildCancellationRefundEmailHtml({ event, ticket, refundAmount, refundTxnId, reason });
      const stmt = db.prepare(`
        INSERT INTO email_outbox (id, ticket_id, to_email, to_name, subject, html_content, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, 'FAILED', datetime('now'))
      `);
      stmt.run(outboxId, ticket.id, ticket.attendee_email, ticket.attendee_name, `⚠️ Event Cancelled: Refund Notice [${event.title}]`, htmlContent);
    } catch (ignore) {}
    return { success: false, error: err.message };
  }
}

/**
 * Build rich HTML email template for 5-Hour Pre-Event Notification
 */
function buildFiveHourReminderEmailHtml({ event, ticket, passUrl }) {
  const formattedDate = new Date(event.start_date).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const paymentAmount = Number(ticket.payment_amount || 0);
  const isPaid = paymentAmount > 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>5-Hour Event Preparation & Entrance Guide</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #0284c7 0%, #6366f1 50%, #8b5cf6 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; }
    .header p { margin: 8px 0 0; color: #e0e7ff; font-size: 14px; }
    .body { padding: 32px 28px; }
    .banner { background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .meta-box { background: #0f172a; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #1e293b; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .meta-row:last-child { margin-bottom: 0; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
    .footer { border-top: 1px solid #1e293b; padding: 18px; text-align: center; font-size: 12px; color: #64748b; background: #0c1222; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p style="text-transform: uppercase; letter-spacing: 2px; font-weight: 700; font-size: 11px; margin-bottom: 6px;">⏰ 5-Hour Automated Notification</p>
      <h1>Event Preparation & Fast-Track Guide</h1>
      <p>${event.title}</p>
    </div>
    <div class="body">
      <div class="banner">
        <strong style="color: #38bdf8; display: block; font-size: 15px; margin-bottom: 4px;">👋 Hello, ${ticket.attendee_name}!</strong>
        <span style="color: #e2e8f0; font-size: 13px; line-height: 1.5;">This is your automated 5-hour attendee notification. Everything is confirmed for your upcoming event. Please review your reserved seat and admission guidelines below.</span>
      </div>

      <div class="meta-box">
        <div class="meta-row"><span style="color: #94a3b8;">Event</span><strong style="color: #ffffff;">${event.title}</strong></div>
        <div class="meta-row"><span style="color: #94a3b8;">Start Date & Time</span><strong style="color: #ffffff;">${formattedDate}</strong></div>
        <div class="meta-row"><span style="color: #94a3b8;">Venue & Location</span><span style="color: #cbd5e1;">${event.venue_name}, ${event.location}</span></div>
        <div class="meta-row"><span style="color: #94a3b8;">Pass Category</span><span style="color: #a5b4fc; font-weight: 700;">${ticket.tier_name}</span></div>
        <div class="meta-row"><span style="color: #94a3b8;">Reserved Seat</span><strong style="color: #38bdf8; font-size: 15px;">Seat ${ticket.seat_number || 'General Admission'}</strong></div>
        <div class="meta-row"><span style="color: #94a3b8;">Payment Billing</span><strong style="color: ${isPaid ? '#34d399' : '#60a5fa'};">${isPaid ? '$' + paymentAmount.toFixed(2) + ' (PAID)' : 'FREE STUDENT PASS'}</strong></div>
        <div class="meta-row"><span style="color: #94a3b8;">Ticket Access Code</span><code style="background: #1e293b; color: #f8fafc; padding: 2px 6px; border-radius: 4px;">${ticket.ticket_code}</code></div>
      </div>

      <h4 style="color: #ffffff; margin-top: 24px; margin-bottom: 12px; font-size: 14px;">Door Fast-Track Instructions:</h4>
      <ul style="color: #94a3b8; font-size: 13px; line-height: 1.6; padding-left: 20px; margin-bottom: 24px;">
        <li>Please have your cryptographic digital pass or QR code loaded on your smartphone.</li>
        <li>Present the QR code at the door webcam scanner for 1-second contactless verification.</li>
        <li>Proceed directly to <strong>Seat ${ticket.seat_number || 'General'}</strong> upon check-in.</li>
      </ul>

      <div style="text-align: center; margin: 28px 0 10px;">
        <a href="${passUrl}" class="btn">View Live Cryptographic Pass & QR</a>
      </div>
    </div>
    <div class="footer">
      EventPass Automated Attendance Engine &bull; Scheduled 5-Hour Notification
    </div>
  </div>
</body>
</html>
  `;
}

async function sendFiveHourReminderEmail({ event, ticket, passUrl }) {
  try {
    const mailer = await getTransporter();
    const htmlContent = buildFiveHourReminderEmailHtml({ event, ticket, passUrl });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"EventPass Notifications" <notifications@eventpass.local>',
      to: `${ticket.attendee_name} <${ticket.attendee_email}>`,
      subject: `⏰ 5-Hour Event Preparation & Entry Guide: ${event.title} [Seat ${ticket.seat_number || 'General'}]`,
      html: htmlContent,
    };

    const info = await mailer.sendMail(mailOptions);
    let previewUrl = null;
    if (nodemailer.getTestMessageUrl && info) {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    }

    const outboxId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO email_outbox (id, ticket_id, to_email, to_name, subject, html_content, status, preview_url, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?, datetime('now'))
    `);
    stmt.run(outboxId, ticket.id, ticket.attendee_email, ticket.attendee_name, mailOptions.subject, htmlContent, previewUrl);

    console.log(`[EmailService] 5-hour notification email sent to ${ticket.attendee_email} for ${ticket.ticket_code}. Preview: ${previewUrl || 'Logged to Outbox'}`);
    return { success: true, previewUrl, outboxId };
  } catch (err) {
    console.error('[EmailService] Failed to send 5-hour notification email:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Build rich HTML email template for Attendee Self-Cancellation & Percentage Refund
 */
function buildAttendeeCancellationEmailHtml({ event, ticket, quote, refundTxnId, reason }) {
  const formattedDate = new Date(event.start_date).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isPaid = (ticket.payment_amount || 0) > 0;
  const isFree = !isPaid;
  const currCode = (event.currency || ticket.currency || 'INR').toUpperCase();
  const currSym = currCode === 'INR' ? '₹' : (currCode === 'EUR' ? '€' : (currCode === 'GBP' ? '£' : (currCode === 'AED' ? 'AED ' : (currCode === 'JPY' ? '¥' : '$'))));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Cancellation & Refund Receipt</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ea580c 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; }
    .header p { margin: 6px 0 0; color: #fecaca; font-size: 13px; }
    .body-content { padding: 32px 28px; }
    .refund-box { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .refund-label { font-size: 12px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 4px; }
    .refund-amount { font-size: 32px; font-weight: 900; color: #34d399; }
    .refund-sub { font-size: 12px; color: #6ee7b7; margin-top: 4px; }
    .meta-grid { background: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #1e293b; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #94a3b8; }
    .meta-value { color: #f1f5f9; font-weight: 600; }
    .policy-card { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 12px; color: #cbd5e1; line-height: 1.5; }
    .footer { border-top: 1px solid #1e293b; padding: 18px; text-align: center; font-size: 12px; color: #64748b; background: #0c1222; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p style="text-transform: uppercase; letter-spacing: 2px; font-weight: 800; font-size: 11px; margin-bottom: 4px;">🚆 Bus & Train Standard Cancellation</p>
      <h1>Pass Cancellation & Refund Receipt</h1>
      <p>Your seat has been released and refund processed</p>
    </div>
    <div class="body-content">
      <p style="margin: 0 0 16px; font-size: 15px; color: #e2e8f0;">
        Hello <strong>${ticket.attendee_name}</strong>,
      </p>
      <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px;">
        As requested, your admission pass for <strong>"${event.title}"</strong> has been successfully cancelled. In accordance with our scheduled event cancellation policy, your refund has been calculated and authorized below.
      </p>

      ${isPaid ? `
      <div class="refund-box">
        <div class="refund-label">Net Refund Amount Credited (${quote.refundPercentage}%)</div>
        <div class="refund-amount">${currSym}${Number(quote.refundAmount).toFixed(2)} ${currCode}</div>
        <div class="refund-sub">Status: <strong>PROCESSED &bull; REFUND TRANSACTION ${refundTxnId}</strong></div>
      </div>
      ` : `
      <div class="refund-box" style="background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.4);">
        <div class="refund-label" style="color: #93c5fd;">Student Admission Released</div>
        <div class="refund-amount" style="color: #60a5fa; font-size: 24px;">Free Pass Cancelled (${currSym}0.00)</div>
        <div class="refund-sub" style="color: #bfdbfe;">No cancellation fee charged. Seat released back to students.</div>
      </div>
      `}

      <div class="meta-grid">
        <div class="meta-row">
          <span class="meta-label">Event Name:</span>
          <span class="meta-value">${event.title}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Event Schedule:</span>
          <span class="meta-value">${formattedDate}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Ticket Pass Code:</span>
          <span class="meta-value" style="font-family: monospace; color: #f87171;">${ticket.ticket_code} (CANCELLED)</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Released Seat:</span>
          <span class="meta-value" style="color: #38bdf8;">Seat ${ticket.seat_number || 'General Entry'}</span>
        </div>
        ${isPaid ? `
        <div class="meta-row">
          <span class="meta-label">Original Booking Amount:</span>
          <span class="meta-value">${currSym}${Number(ticket.payment_amount).toFixed(2)} ${currCode}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Cancellation Policy Slab:</span>
          <span class="meta-value" style="color: #fbbf24;">${quote.slabLabel}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Cancellation Deduction (${100 - quote.refundPercentage}%):</span>
          <span class="meta-value" style="color: #f87171;">-${currSym}${Number(quote.cancellationFee).toFixed(2)} ${currCode}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Net Refund Payable:</span>
          <span class="meta-value" style="color: #34d399; font-size: 15px;">+${currSym}${Number(quote.refundAmount).toFixed(2)} ${currCode}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Refund Reference ID:</span>
          <span class="meta-value" style="font-family: monospace; color: #38bdf8;">${refundTxnId}</span>
        </div>
        ` : ''}
        ${reason ? `
        <div class="meta-row">
          <span class="meta-label">Reason Stated:</span>
          <span class="meta-value" style="font-style: italic;">${reason}</span>
        </div>
        ` : ''}
      </div>

      <div class="policy-card">
        <strong style="color: #818cf8; display: block; margin-bottom: 4px;">🎟️ EventPass Cancellation Policy Applied:</strong>
        ${quote.policyDescription}
        <br/><br/>
        Refunds are reversed through the original payment gateway (Razorpay / UPI / Card) and typically reflect in your account statement within 3 to 5 banking business days.
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 16px 0 0;">
        ⚠️ Note: This ticket pass QR code has been permanently invalidated in the entrance validation system and will be rejected if presented at the door.
      </p>
    </div>
    <div class="footer">
      EventPass Automated Ticketing Engine &bull; Automated Pass Cancellation Protocol
    </div>
  </div>
</body>
</html>
  `;
}

async function sendAttendeeCancellationEmail({ event, ticket, quote, refundTxnId, reason }) {
  try {
    const mailer = await getTransporter();
    const htmlContent = buildAttendeeCancellationEmailHtml({ event, ticket, quote, refundTxnId, reason });
    const isPaid = (ticket.payment_amount || 0) > 0;
    const currCode = (event.currency || ticket.currency || 'INR').toUpperCase();
    const currSym = currCode === 'INR' ? '₹' : (currCode === 'EUR' ? '€' : (currCode === 'GBP' ? '£' : (currCode === 'AED' ? 'AED ' : (currCode === 'JPY' ? '¥' : '$'))));

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"EventPass Ticketing" <passes@eventpass.local>',
      to: `${ticket.attendee_name} <${ticket.attendee_email}>`,
      subject: `❌ Pass Cancelled & ${isPaid ? `${currSym}${Number(quote.refundAmount).toFixed(2)} Refund Processed` : 'Seat Released'} [${event.title}]`,
      html: htmlContent,
    };

    const info = await mailer.sendMail(mailOptions);
    let previewUrl = null;
    if (nodemailer.getTestMessageUrl && info) {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    }

    const outboxId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO email_outbox (id, ticket_id, to_email, to_name, subject, html_content, status, preview_url, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?, datetime('now'))
    `);
    stmt.run(outboxId, ticket.id, ticket.attendee_email, ticket.attendee_name, mailOptions.subject, htmlContent, previewUrl);

    console.log(`[EmailService] Attendee cancellation email sent to ${ticket.attendee_email} for ${ticket.ticket_code}. Preview: ${previewUrl || 'Logged to Outbox'}`);
    return { success: true, previewUrl, outboxId };
  } catch (err) {
    console.error('[EmailService] Failed to send attendee cancellation email:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendTicketEmail,
  buildTicketEmailHtml,
  sendPasswordResetEmail,
  buildPasswordResetEmailHtml,
  sendCancellationRefundEmail,
  buildCancellationRefundEmailHtml,
  sendFiveHourReminderEmail,
  buildFiveHourReminderEmailHtml,
  sendAttendeeCancellationEmail,
  buildAttendeeCancellationEmailHtml,
};
