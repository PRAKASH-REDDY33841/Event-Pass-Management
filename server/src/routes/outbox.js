const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * GET /api/outbox/scheduled - Get all scheduled 5-hour notifications
 */
router.get('/scheduled', (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT 
        sn.*,
        t.seat_number,
        t.tier_name,
        t.payment_status,
        t.payment_amount,
        e.title as event_title,
        e.start_date as event_start_date
      FROM scheduled_notifications sn
      LEFT JOIN tickets t ON sn.ticket_id = t.id
      LEFT JOIN events e ON sn.event_id = e.id
      ORDER BY sn.created_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, notifications });
  } catch (err) {
    console.error('Error fetching scheduled notifications:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch scheduled notifications' });
  }
});

/**
 * POST /api/outbox/scheduled/:id/trigger - Trigger a scheduled 5-hour notification immediately (Demo / Testing)
 */
router.post('/scheduled/:id/trigger', async (req, res) => {
  try {
    const { sendNotificationNow } = require('../services/notificationService');
    const result = await sendNotificationNow(req.params.id);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'Failed to dispatch notification' });
    }

    res.json({
      success: true,
      message: '5-hour notification successfully dispatched!',
      previewUrl: result.previewUrl || null,
    });
  } catch (err) {
    console.error('Error triggering scheduled notification:', err);
    res.status(500).json({ success: false, error: err.message || 'Trigger failed' });
  }
});

/**
 * GET /api/outbox - Get all sent ticket emails
 */
router.get('/', (req, res) => {
  try {
    const emails = db.prepare(`
      SELECT id, ticket_id, to_email, to_name, subject, status, preview_url, sent_at
      FROM email_outbox
      ORDER BY sent_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, emails });
  } catch (err) {
    console.error('Error fetching email outbox:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch email outbox' });
  }
});

/**
 * GET /api/outbox/:id - Get raw email content / preview HTML with rendered QR
 */
router.get('/:id', async (req, res) => {
  try {
    const email = db.prepare('SELECT * FROM email_outbox WHERE id = ?').get(req.params.id);
    if (!email) {
      return res.status(404).send('Email record not found');
    }

    if (req.query.raw === 'true') {
      res.json({ success: true, email });
    } else {
      let html = email.html_content || '';

      // Always ensure the QR image in email preview is properly populated with the base64 data URL
      try {
        let jwtToken = null;
        if (email.ticket_id) {
          const tRow = db.prepare('SELECT jwt_token FROM tickets WHERE id = ? OR ticket_code = ?').get(email.ticket_id, email.ticket_id);
          if (tRow && tRow.jwt_token) {
            jwtToken = tRow.jwt_token;
          }
        }

        // If ticket wasn't found by ticket_id, try to extract ticket code from subject line e.g. [EP-VIP-1234]
        if (!jwtToken && email.subject) {
          const match = email.subject.match(/\[([A-Z0-9-]+)\]/);
          if (match && match[1]) {
            const tRow = db.prepare('SELECT jwt_token FROM tickets WHERE ticket_code = ?').get(match[1]);
            if (tRow && tRow.jwt_token) {
              jwtToken = tRow.jwt_token;
            }
          }
        }

        if (jwtToken) {
          const { generateQrDataUrl } = require('../services/qrService');
          const qrDataUrl = await generateQrDataUrl(jwtToken);
          // Replace any cid references or empty/broken img tags
          html = html.replace(/src=["']cid:ticket_qr_code["']/gi, `src="${qrDataUrl}"`);
          html = html.replace(/cid:ticket_qr_code/gi, qrDataUrl);
          // If the qr-image tag has an empty or broken src
          html = html.replace(/<img[^>]*class=["']qr-image["'][^>]*>/gi, `<img src="${qrDataUrl}" alt="Secure Ticket QR Code" class="qr-image" style="width: 220px; height: 220px; display: block; margin: 0 auto;" />`);
        }
      } catch (qrErr) {
        console.warn('[Outbox] Could not generate preview QR fallback:', qrErr.message);
      }

      // Return rendered HTML directly so organizers and attendees can preview the email in an iframe or modal!
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    }
  } catch (err) {
    console.error('Error fetching email:', err);
    res.status(500).send('Failed to load email');
  }
});

module.exports = router;
