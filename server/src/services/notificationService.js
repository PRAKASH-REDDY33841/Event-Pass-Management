const db = require('../db');
const { sendFiveHourReminderEmail } = require('./emailService');

/**
 * Send a specific scheduled notification now
 */
async function sendNotificationNow(notificationId) {
  try {
    const notif = db.prepare('SELECT * FROM scheduled_notifications WHERE id = ?').get(notificationId);
    if (!notif) {
      return { success: false, error: 'Scheduled notification not found' };
    }

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(notif.ticket_id);
    if (!ticket) {
      return { success: false, error: 'Associated ticket not found' };
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(notif.event_id);
    if (!event) {
      return { success: false, error: 'Associated event not found' };
    }

    const passUrl = `${process.env.APP_URL || 'http://localhost:5173'}/ticket/${ticket.ticket_code}`;
    const result = await sendFiveHourReminderEmail({ event, ticket, passUrl });

    if (result.success) {
      db.prepare(`
        UPDATE scheduled_notifications 
        SET status = 'SENT', sent_at = datetime('now'), preview_url = ? 
        WHERE id = ?
      `).run(result.previewUrl || null, notificationId);
    }

    return result;
  } catch (err) {
    console.error('[NotificationService] Error executing notification:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Scan and process any notifications whose scheduled_for time has passed
 */
async function processDueNotifications() {
  try {
    const dueNotifications = db.prepare(`
      SELECT * FROM scheduled_notifications 
      WHERE status = 'PENDING' AND datetime(scheduled_for) <= datetime('now')
      LIMIT 20
    `).all();

    for (const notif of dueNotifications) {
      await sendNotificationNow(notif.id);
    }
  } catch (err) {
    console.error('[NotificationService] Error processing due notifications:', err);
  }
}

let workerInterval = null;

function startNotificationWorker() {
  if (workerInterval) return;
  console.log('[NotificationService] ⏰ 5-Hour Automated Notification Worker started');
  // Check every 20 seconds for due notifications
  workerInterval = setInterval(processDueNotifications, 20000);
}

module.exports = {
  sendNotificationNow,
  processDueNotifications,
  startNotificationWorker,
};

