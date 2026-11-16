const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateTicketCode, generateNonce, signTicketPayload, hashPassword } = require('../services/cryptoService');
const { generateQrDataUrl } = require('../services/qrService');
const { sendTicketEmail, sendCancellationRefundEmail, sendAttendeeCancellationEmail } = require('../services/emailService');
const { getEventStats } = require('../services/statsService');
const { requireOrganizer } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * EventPass Cancellation & Refund Slab Calculator
 * 
 * Rules based on hours/minutes before scheduled event start time:
 * - > 48 hours before start: 90% Refund (10% processing fee)
 * - 24 to 48 hours before start: 75% Refund (25% cancellation charge)
 * - 12 to 24 hours before start: 50% Refund (50% cancellation charge)
 * - 2 to 12 hours before start: 25% Refund (75% late cancellation charge)
 * - 5 Minutes to 2 Hours before start: 10% Refund (Emergency last-minute cancellation window)
 * - < 5 minutes before start OR event has started: 0% Refund (Gate check-in underway / locked)
 * - Free events: 100% free cancellation anytime up to 5 minutes before start
 */
function calculateCancellationRefund(startDateStr, paymentAmount) {
  const eventStart = new Date(startDateStr).getTime();
  const now = Date.now();
  const diffMs = eventStart - now;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = diffMs / (1000 * 60 * 60);
  const amount = Number(paymentAmount) || 0;

  // If start date has passed or less than 5 minutes remain
  if (diffMinutes < 5) {
    const isStarted = diffMinutes <= 0;
    return {
      canCancel: false,
      hoursRemaining: Math.max(0, Math.round(diffHours * 10) / 10),
      minutesRemaining: Math.max(0, diffMinutes),
      refundPercentage: 0,
      refundAmount: 0,
      cancellationFee: amount,
      originalAmount: amount,
      slabLabel: isStarted ? 'Event Started / Concluded (Non-refundable)' : '< 5 Minutes (Non-refundable Gate Lockout)',
      policyDescription: isStarted
        ? 'The event has already commenced. Passes cannot be cancelled or refunded.'
        : 'Cancellations close 5 minutes prior to scheduled start time for entrance gate verification.',
      isEventStarted: isStarted,
    };
  }

  // Free passes can be cancelled anytime before 5 minutes
  if (amount <= 0) {
    return {
      canCancel: true,
      hoursRemaining: Math.max(0, Math.round(diffHours * 10) / 10),
      minutesRemaining: diffMinutes,
      refundPercentage: 100,
      refundAmount: 0,
      cancellationFee: 0,
      originalAmount: 0,
      slabLabel: 'Free Admission (100% Free Cancellation)',
      policyDescription: 'Free admission passes can be cancelled up to 5 minutes before event start. Seat is instantly released back.',
      isEventStarted: false,
    };
  }

  let refundPercentage = 0;
  let slabLabel = '';
  let policyDescription = '';

  if (diffHours > 48) {
    refundPercentage = 90;
    slabLabel = '> 48 Hours Before Event (90% Refund)';
    policyDescription = 'Early Cancellation Window: 90% refund issued with 10% processing fee deduction.';
  } else if (diffHours >= 24) {
    refundPercentage = 75;
    slabLabel = '24 to 48 Hours Before Event (75% Refund)';
    policyDescription = 'Standard Cancellation Window: 75% refund issued with 25% cancellation charge.';
  } else if (diffHours >= 12) {
    refundPercentage = 50;
    slabLabel = '12 to 24 Hours Before Event (50% Refund)';
    policyDescription = 'Mid-Range Cancellation Window: 50% refund issued with 50% cancellation charge.';
  } else if (diffHours >= 2) {
    refundPercentage = 25;
    slabLabel = '2 to 12 Hours Before Event (25% Refund)';
    policyDescription = 'Late Cancellation Window: 25% refund issued with 75% deduction.';
  } else {
    // 5 minutes to 2 hours remaining: User has option to cancel before 5 min!
    refundPercentage = 10;
    slabLabel = '5 Minutes to 2 Hours (10% Refund)';
    policyDescription = 'Emergency Last-Minute Window: 10% refund issued. Available up to 5 minutes before event start.';
  }

  const refundAmount = Math.round((amount * (refundPercentage / 100)) * 100) / 100;
  const cancellationFee = Math.round((amount - refundAmount) * 100) / 100;

  return {
    canCancel: true,
    hoursRemaining: Math.round(diffHours * 10) / 10,
    minutesRemaining: diffMinutes,
    refundPercentage,
    refundAmount,
    cancellationFee,
    originalAmount: amount,
    slabLabel,
    policyDescription,
    isEventStarted: false,
  };
}

/**
 * Helper to get the socket.io instance
 */
function getIO(req) {
  return req.app.get('io');
}

/**
 * GET /api/tickets/event/:eventId/booked-seats - Return all taken seat numbers for an event
 */
router.get('/event/:eventId/booked-seats', (req, res) => {
  try {
    const { eventId } = req.params;
    const rows = db.prepare(`
      SELECT seat_number 
      FROM tickets 
      WHERE event_id = ? 
        AND seat_number IS NOT NULL 
        AND status NOT IN ('CANCELLED', 'CANCELLED_REFUNDED')
    `).all(eventId);

    const bookedSeats = rows.map(r => r.seat_number);
    res.json({ success: true, bookedSeats });
  } catch (err) {
    console.error('Error fetching booked seats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch booked seats' });
  }
});

/**
 * GET /api/tickets/check-registration - Check if attendee email has already registered for this event
 */
router.get('/check-registration', (req, res) => {
  try {
    const { event_id, email } = req.query;
    if (!event_id || !email) {
      return res.status(400).json({ success: false, error: 'event_id and email are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare(`
      SELECT t.id, t.ticket_code, t.seat_number, t.tier_name, t.status, t.payment_status, t.payment_amount, t.created_at, e.title as event_title
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      WHERE t.event_id = ? 
        AND LOWER(t.attendee_email) = ? 
        AND t.status NOT IN ('CANCELLED', 'CANCELLED_REFUNDED')
    `).get(event_id, normalizedEmail);

    if (existing) {
      return res.json({
        success: true,
        alreadyRegistered: true,
        ticket: existing,
      });
    }

    res.json({ success: true, alreadyRegistered: false });
  } catch (err) {
    console.error('Error checking registration:', err);
    res.status(500).json({ success: false, error: 'Failed to verify registration status' });
  }
});

/**
 * GET /api/tickets/my-registrations - List all active registrations for an attendee email
 */
router.get('/my-registrations', (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Attendee email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const registrations = db.prepare(`
      SELECT 
        t.id, t.ticket_code, t.event_id, t.tier_name, t.seat_number, 
        t.status, t.payment_status, t.payment_amount, t.payment_method, t.created_at,
        e.title as event_title, e.start_date, e.end_date, e.venue_name, e.location
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      WHERE LOWER(t.attendee_email) = ?
        AND t.status NOT IN ('CANCELLED', 'CANCELLED_REFUNDED')
      ORDER BY t.created_at DESC
    `).all(normalizedEmail);

    res.json({ success: true, registrations });
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch registrations' });
  }
});

/**
 * POST /api/tickets/register - Register attendee, process payment, reserve seat, and issue cryptographic ticket
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      event_id, 
      tier_id, 
      attendee_name, 
      attendee_email, 
      attendee_phone, 
      organization,
      seat_number,
      payment_method,
      transaction_id 
    } = req.body;

    if (!event_id || !attendee_name || !attendee_email) {
      return res.status(400).json({ success: false, error: 'Event, name, and email are required.' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    if (event.status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'This event has been cancelled and is no longer accepting registrations.' });
    }

    const normalizedEmail = attendee_email.trim().toLowerCase();

    // Check if attendee exists in attendees database table; if not, automatically create an attendee profile!
    let attendeeInDb = db.prepare('SELECT id, name, email FROM attendees WHERE email = ?').get(normalizedEmail);
    if (!attendeeInDb) {
      const newAttendeeId = 'att_' + uuidv4().replace(/-/g, '').slice(0, 12);
      const defaultPassword = 'Pass_' + Math.random().toString(36).slice(-8);
      const passwordHash = hashPassword(defaultPassword);

      db.prepare(`
        INSERT INTO attendees (id, name, email, password_hash, phone, organization, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))
      `).run(
        newAttendeeId,
        attendee_name.trim(),
        normalizedEmail,
        passwordHash,
        attendee_phone ? attendee_phone.trim() : '',
        organization ? organization.trim() : ''
      );

      attendeeInDb = { id: newAttendeeId, name: attendee_name.trim(), email: normalizedEmail };
      console.log(`[Tickets] Auto-created attendee profile for guest booking: "${attendee_name.trim()}" <${normalizedEmail}>`);
    }

    // Prevent duplicate active registration for the same attendee on the same event
    const existingRegistration = db.prepare(`
      SELECT id, ticket_code, seat_number, attendee_name, status, created_at
      FROM tickets 
      WHERE event_id = ? 
        AND LOWER(attendee_email) = ? 
        AND status NOT IN ('CANCELLED', 'CANCELLED_REFUNDED')
    `).get(event_id, normalizedEmail);

    if (existingRegistration) {
      return res.status(409).json({
        success: false,
        error: `You are already registered for this event with Ticket Code ${existingRegistration.ticket_code} (Seat ${existingRegistration.seat_number || 'General Entry'}). Each attendee is only allowed one active registration per event.`,
        alreadyRegistered: true,
        ticket: existingRegistration,
      });
    }

    let tier = null;
    if (tier_id) {
      tier = db.prepare('SELECT * FROM ticket_tiers WHERE id = ? AND event_id = ?').get(tier_id, event_id);
    }
    const tierName = tier ? tier.name : 'General Admission';
    const tierPrice = tier ? Number(tier.price) : 0.0;

    // Check capacity
    const registeredCount = db.prepare(`
      SELECT COUNT(*) as count FROM tickets 
      WHERE event_id = ? AND status NOT IN ('CANCELLED', 'CANCELLED_REFUNDED')
    `).get(event_id).count;

    if (registeredCount >= event.capacity) {
      return res.status(400).json({ success: false, error: 'This event has reached full capacity.' });
    }

    // Validate seat number if provided
    const cleanSeat = seat_number ? seat_number.trim().toUpperCase() : null;
    if (cleanSeat) {
      const existingSeat = db.prepare(`
        SELECT id, attendee_name FROM tickets 
        WHERE event_id = ? AND seat_number = ? AND status NOT IN ('CANCELLED', 'CANCELLED_REFUNDED')
      `).get(event_id, cleanSeat);

      if (existingSeat) {
        return res.status(409).json({ 
          success: false, 
          error: `Seat ${cleanSeat} is already booked. Please choose another seat.` 
        });
      }
    }

    // Determine payment details
    const isPaid = tierPrice > 0;
    const paymentStatus = isPaid ? 'PAID' : 'FREE';
    const paymentAmount = isPaid ? tierPrice : 0.0;
    const finalMethod = isPaid ? (payment_method || 'CARD').toUpperCase() : 'STUDENT_PASS';
    const finalTxnId = transaction_id || (isPaid ? `txn_${uuidv4().replace(/-/g, '').slice(0, 12)}` : `free_${uuidv4().replace(/-/g, '').slice(0, 8)}`);

    const ticketId = 'tkt_' + uuidv4().slice(0, 12);
    const ticketCode = generateTicketCode(tierName);
    const nonce = generateNonce();

    // Sign cryptographic JWT with embedded seat & payment verification
    const jwtToken = signTicketPayload({
      ticketId,
      ticketCode,
      eventId: event.id,
      attendeeName: attendee_name.trim(),
      attendeeEmail: attendee_email.trim().toLowerCase(),
      tierName,
      seatNumber: cleanSeat || 'General',
      paymentStatus,
      nonce,
    });

    // Generate high-resolution QR data URL
    const qrDataUrl = await generateQrDataUrl(jwtToken);

    const eventCurrency = (event.currency || 'INR').toUpperCase();

    // Insert into database with full seat & billing audit trail
    const insertTicket = db.prepare(`
      INSERT INTO tickets (
        id, ticket_code, event_id, tier_id, tier_name,
        attendee_name, attendee_email, attendee_phone, organization,
        status, signature_nonce, jwt_token,
        seat_number, payment_status, payment_amount, payment_method, transaction_id, paid_at,
        currency, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'VALID', ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))
    `);

    insertTicket.run(
      ticketId,
      ticketCode,
      event.id,
      tier ? tier.id : null,
      tierName,
      attendee_name.trim(),
      attendee_email.trim().toLowerCase(),
      attendee_phone ? attendee_phone.trim() : null,
      organization ? organization.trim() : null,
      nonce,
      jwtToken,
      cleanSeat || 'General',
      paymentStatus,
      paymentAmount,
      finalMethod,
      finalTxnId,
      eventCurrency
    );

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);

    // Compute public ticket pass URL
    const clientHost = req.headers.origin || process.env.APP_URL || `${req.protocol}://${req.get('host')}` || 'http://localhost:5173';
    const passUrl = `${clientHost}/ticket/${ticketCode}`;

    // Send email asynchronously and log in outbox
    let emailResult = { success: true };
    try {
      emailResult = await sendTicketEmail({ event, ticket, passUrl });
    } catch (mailErr) {
      console.warn('Could not complete email dispatch, recorded in outbox:', mailErr.message);
    }

    // Schedule 5-Hour attendee notification
    const notifId = 'notif_' + uuidv4().slice(0, 12);
    const scheduledDate = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const scheduledFor = scheduledDate.toISOString();

    try {
      db.prepare(`
        INSERT INTO scheduled_notifications (
          id, ticket_id, ticket_code, event_id, attendee_name, attendee_email,
          subject, notification_type, scheduled_for, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, '5_HOUR_REMINDER', ?, 'PENDING', datetime('now'))
      `).run(
        notifId,
        ticketId,
        ticketCode,
        event.id,
        ticket.attendee_name,
        ticket.attendee_email,
        `⏰ 5-Hour Event Preparation & Entry Guide: ${event.title}`,
        scheduledFor
      );
      console.log(`[NotificationService] Scheduled 5-hour notification for ${ticket.attendee_email} at ${scheduledFor}`);
    } catch (notifErr) {
      console.warn('[NotificationService] Could not schedule 5h notification:', notifErr.message);
    }

    // Broadcast stats update via Socket.io
    const io = getIO(req);
    if (io) {
      const stats = getEventStats(event.id);
      io.to(`event_${event.id}`).emit('stats:updated', stats);
      io.to(`event_${event.id}`).emit('ticket:registered', {
        ticketCode,
        attendee_name: ticket.attendee_name,
        tier_name: ticket.tier_name,
        created_at: ticket.created_at,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your cryptographically signed ticket has been issued.',
      ticket: {
        ...ticket,
        qrDataUrl,
        passUrl,
      },
      emailPreviewUrl: emailResult.previewUrl || null,
      outboxId: emailResult.outboxId || null,
      scheduledNotification: {
        id: notifId,
        scheduled_for: scheduledFor,
        type: '5_HOUR_REMINDER',
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: err.message || 'Registration failed' });
  }
});

/**
 * GET /api/tickets/code/:code - Lookup ticket for digital pass display
 */
router.get('/code/:code', async (req, res) => {
  try {
    const code = req.params.code.trim();
    const ticket = db.prepare('SELECT * FROM tickets WHERE ticket_code = ? OR id = ?').get(code, code);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(ticket.event_id);
    const qrDataUrl = await generateQrDataUrl(ticket.jwt_token);

    res.json({
      success: true,
      ticket: {
        ...ticket,
        qrDataUrl,
      },
      event,
    });
  } catch (err) {
    console.error('Error fetching ticket:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
  }
});

/**
 * GET /api/tickets/lookup-by-email - Find tickets registered to an email address
 */
router.get('/lookup-by-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tickets = db.prepare(`
      SELECT t.*, e.title as event_title, e.start_date, e.end_date, e.venue_name, e.location, e.status as event_status, e.currency as event_currency
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      WHERE LOWER(t.attendee_email) = ?
      ORDER BY t.created_at DESC
    `).all(normalizedEmail);

    if (!tickets.length) {
      return res.status(404).json({
        success: false,
        error: `No tickets found registered to "${normalizedEmail}". Please check spelling or register for an event.`,
      });
    }

    res.json({
      success: true,
      tickets,
      count: tickets.length,
    });
  } catch (err) {
    console.error('Error in email lookup:', err);
    res.status(500).json({ success: false, error: 'Failed to lookup tickets by email' });
  }
});

/**
 * GET /api/tickets/event/:eventId - List all attendees/tickets for event organizer dashboard
 */
router.get('/event/:eventId', (req, res) => {
  try {
    const { eventId } = req.params;
    const { search, status, tier } = req.query;

    let query = 'SELECT * FROM tickets WHERE event_id = ?';
    const params = [eventId];

    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (tier && tier !== 'ALL') {
      query += ' AND tier_name = ?';
      params.push(tier);
    }

    if (search) {
      query += ' AND (attendee_name LIKE ? OR attendee_email LIKE ? OR ticket_code LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY created_at DESC';

    const tickets = db.prepare(query).all(...params);
    res.json({ success: true, tickets });
  } catch (err) {
    console.error('Error fetching event tickets:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

/**
 * PATCH /api/tickets/:id/override - Manual check-in or reset by organizer (Organizer only)
 */
router.patch('/:id/override', requireOrganizer, (req, res) => {
  try {
    const { id } = req.params;
    const { action, door_name, scanned_by } = req.body; // action: 'CHECK_IN' | 'RESET'

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? OR ticket_code = ?').get(id, id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const door = door_name || 'Admin Manual Override';
    const by = scanned_by || 'Organizer';

    if (action === 'CHECK_IN') {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE tickets 
        SET status = 'CHECKED_IN', checked_in_at = ?, checked_in_by = ?, check_in_door = ?
        WHERE id = ?
      `).run(now, by, door, ticket.id);

      // Add log
      db.prepare(`
        INSERT INTO check_in_logs (id, ticket_id, ticket_code, event_id, attendee_name, tier_name, door_name, scanned_by, scan_result, scan_message, scanned_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'log_' + uuidv4().slice(0, 8),
        ticket.id,
        ticket.ticket_code,
        ticket.event_id,
        ticket.attendee_name,
        ticket.tier_name,
        door,
        by,
        'SUCCESS',
        'Manual check-in verified by organizer',
        now
      );
    } else if (action === 'RESET') {
      db.prepare(`
        UPDATE tickets 
        SET status = 'VALID', checked_in_at = NULL, checked_in_by = NULL, check_in_door = NULL
        WHERE id = ?
      `).run(ticket.id);

      db.prepare(`
        INSERT INTO check_in_logs (id, ticket_id, ticket_code, event_id, attendee_name, tier_name, door_name, scanned_by, scan_result, scan_message, scanned_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        'log_' + uuidv4().slice(0, 8),
        ticket.id,
        ticket.ticket_code,
        ticket.event_id,
        ticket.attendee_name,
        ticket.tier_name,
        door,
        by,
        'SUCCESS',
        'Check-in status reset to VALID by organizer',
        new Date().toISOString()
      );
    }

    const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);

    // Notify socket clients
    const io = getIO(req);
    if (io) {
      const stats = getEventStats(ticket.event_id);
      io.to(`event_${ticket.event_id}`).emit('stats:updated', stats);
      io.to(`event_${ticket.event_id}`).emit('ticket:status_changed', {
        ticket: updated,
        action,
      });
    }

    res.json({ success: true, ticket: updated });
  } catch (err) {
    console.error('Error overriding ticket:', err);
    res.status(500).json({ success: false, error: 'Failed to update ticket status' });
  }
});

/**
 * DELETE /api/tickets/:id/revoke - Revoke a ticket permanently (Organizer only)
 */
router.delete('/:id/revoke', requireOrganizer, (req, res) => {
  try {
    const { id } = req.params;
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? OR ticket_code = ?').get(id, id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // Changing nonce breaks any existing JWT verification immediately
    const newNonce = generateNonce();
    db.prepare(`
      UPDATE tickets 
      SET status = 'REVOKED', signature_nonce = ?
      WHERE id = ?
    `).run(newNonce, ticket.id);

    // Log revocation
    db.prepare(`
      INSERT INTO check_in_logs (id, ticket_id, ticket_code, event_id, attendee_name, tier_name, door_name, scanned_by, scan_result, scan_message, scanned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      'log_' + uuidv4().slice(0, 8),
      ticket.id,
      ticket.ticket_code,
      ticket.event_id,
      ticket.attendee_name,
      ticket.tier_name,
      'Admin Console',
      'System Admin',
      'REVOKED',
      'Ticket was revoked by organizer',
      new Date().toISOString()
    );

    const io = getIO(req);
    if (io) {
      const stats = getEventStats(ticket.event_id);
      io.to(`event_${ticket.event_id}`).emit('stats:updated', stats);
    }

    res.json({ success: true, message: 'Ticket revoked successfully' });
  } catch (err) {
    console.error('Error revoking ticket:', err);
    res.status(500).json({ success: false, error: 'Failed to revoke ticket' });
  }
});

/**
 * POST /api/tickets/:id/refund - Process individual ticket refund (Organizer only)
 */
router.post('/:id/refund', requireOrganizer, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? OR ticket_code = ?').get(id, id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    if (ticket.status === 'CANCELLED_REFUNDED' || ticket.payment_status === 'REFUNDED') {
      return res.status(400).json({ success: false, error: 'Ticket has already been refunded.' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(ticket.event_id);
    const refundAmount = ticket.payment_amount || 0.0;
    const refundTxnId = `ref_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
    const newNonce = generateNonce();

    db.prepare(`
      UPDATE tickets
      SET status = 'CANCELLED_REFUNDED',
          payment_status = 'REFUNDED',
          refund_amount = ?,
          refund_transaction_id = ?,
          refunded_at = datetime('now'),
          signature_nonce = ?
      WHERE id = ?
    `).run(refundAmount, refundTxnId, newNonce, ticket.id);

    // Send cancellation & refund email receipt
    let emailResult = null;
    try {
      emailResult = await sendCancellationRefundEmail({
        event: event || { title: 'Event' },
        ticket,
        refundAmount,
        refundTxnId,
        reason: reason || 'Individual attendee refund requested',
      });
    } catch (mailErr) {
      console.warn('Refund email dispatch error:', mailErr.message);
    }

    const io = getIO(req);
    if (io) {
      const stats = getEventStats(ticket.event_id);
      io.to(`event_${ticket.event_id}`).emit('stats:updated', stats);
    }

    res.json({
      success: true,
      message: `Full refund of $${refundAmount.toFixed(2)} processed for ${ticket.attendee_name}`,
      refundTransactionId: refundTxnId,
      refundAmount,
      previewUrl: emailResult?.previewUrl || null,
    });
  } catch (err) {
    console.error('Error processing refund:', err);
    res.status(500).json({ success: false, error: 'Failed to process refund' });
  }
});

/**
 * GET /api/tickets/:id/cancellation-quote - Calculate real-time percentage refund quote based on event cancellation policy
 */
router.get('/:id/cancellation-quote', (req, res) => {
  try {
    const { id } = req.params;
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? OR ticket_code = ?').get(id, id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket pass not found' });
    }

    if (ticket.status === 'CANCELLED_REFUNDED' || ticket.payment_status === 'REFUNDED') {
      return res.status(400).json({ success: false, error: 'This ticket pass has already been cancelled and refunded.' });
    }

    if (ticket.status === 'CHECKED_IN') {
      return res.status(400).json({ success: false, error: 'This ticket has already been used for entry at the door and cannot be cancelled.' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(ticket.event_id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Associated event not found' });
    }

    const quote = calculateCancellationRefund(event.start_date, ticket.payment_amount);

    res.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticket_code: ticket.ticket_code,
        seat_number: ticket.seat_number,
        tier_name: ticket.tier_name,
        payment_amount: ticket.payment_amount,
        payment_status: ticket.payment_status,
        currency: ticket.currency || event.currency || 'INR',
      },
      event: {
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        venue_name: event.venue_name,
        location: event.location,
        currency: event.currency || 'INR',
        country: event.country || 'India',
        city: event.city || 'Bengaluru',
      },
      quote,
    });
  } catch (err) {
    console.error('Error calculating cancellation quote:', err);
    res.status(500).json({ success: false, error: 'Failed to calculate cancellation quote' });
  }
});

/**
 * POST /api/tickets/:id/cancel-by-attendee - Attendee self-cancellation with percentage refund based on event policy
 */
router.post('/:id/cancel-by-attendee', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? OR ticket_code = ?').get(id, id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket pass not found' });
    }

    if (ticket.status === 'CANCELLED_REFUNDED' || ticket.payment_status === 'REFUNDED') {
      return res.status(400).json({ success: false, error: 'This ticket has already been cancelled.' });
    }

    if (ticket.status === 'CHECKED_IN') {
      return res.status(400).json({ success: false, error: 'Cannot cancel a ticket that has already been verified and admitted at the entrance door.' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(ticket.event_id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const quote = calculateCancellationRefund(event.start_date, ticket.payment_amount);
    const refundTxnId = `ref_bus_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
    const newNonce = generateNonce();

    // Determine updated payment status
    let newPaymentStatus = 'FREE_CANCELLED';
    if (ticket.payment_amount > 0) {
      newPaymentStatus = quote.refundAmount > 0 ? 'REFUNDED' : 'FORFEITED_FEE';
    }

    // 1. Update ticket in DB - Releases the seat!
    db.prepare(`
      UPDATE tickets
      SET status = 'CANCELLED_REFUNDED',
          payment_status = ?,
          refund_amount = ?,
          cancellation_fee = ?,
          refund_percentage = ?,
          cancellation_reason = ?,
          refund_transaction_id = ?,
          refunded_at = datetime('now'),
          signature_nonce = ?
      WHERE id = ?
    `).run(
      newPaymentStatus,
      quote.refundAmount,
      quote.cancellationFee,
      quote.refundPercentage,
      reason || 'Attendee requested cancellation',
      refundTxnId,
      newNonce,
      ticket.id
    );

    // 2. Cancel pending 5-hour scheduled notification for this ticket
    try {
      db.prepare(`
        UPDATE scheduled_notifications 
        SET status = 'CANCELLED' 
        WHERE ticket_id = ? AND status = 'PENDING'
      `).run(ticket.id);
    } catch (e) {
      console.warn('Could not cancel scheduled notification:', e.message);
    }

    // 3. Log into entrance audit trail
    try {
      db.prepare(`
        INSERT INTO check_in_logs (id, ticket_id, ticket_code, event_id, attendee_name, tier_name, door_name, scanned_by, scan_result, scan_message, scanned_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Self-Service Portal', 'Attendee', 'CANCELLED', ?, datetime('now'))
      `).run(
        'log_' + uuidv4().slice(0, 8),
        ticket.id,
        ticket.ticket_code,
        ticket.event_id,
        ticket.attendee_name,
        ticket.tier_name,
        `Pass cancelled by attendee. Seat ${ticket.seat_number || 'General'} released. Refund: $${quote.refundAmount} (${quote.refundPercentage}%)`
      );
    } catch (e) {
      console.warn('Could not log cancellation:', e.message);
    }

    // 4. Send attendee cancellation email with detailed percentage breakdown
    let emailResult = null;
    try {
      emailResult = await sendAttendeeCancellationEmail({
        event,
        ticket,
        quote,
        refundTxnId,
        reason: reason || 'Attendee requested cancellation',
      });
    } catch (mailErr) {
      console.warn('Attendee cancellation email failed:', mailErr.message);
    }

    // 5. Broadcast live seat release and stats update to all organizers & students
    const io = getIO(req);
    if (io) {
      const stats = getEventStats(ticket.event_id);
      io.to(`event_${ticket.event_id}`).emit('stats:updated', stats);
      io.to(`event_${ticket.event_id}`).emit('seat:released', {
        eventId: ticket.event_id,
        seatNumber: ticket.seat_number,
      });
      io.to(`event_${ticket.event_id}`).emit('ticket:cancelled', {
        ticketId: ticket.id,
        ticketCode: ticket.ticket_code,
        seatNumber: ticket.seat_number,
      });
    }

    const currCode = (event.currency || ticket.currency || 'INR').toUpperCase();
    const currSym = currCode === 'INR' ? '₹' : (currCode === 'EUR' ? '€' : (currCode === 'GBP' ? '£' : '$'));

    console.log(`[Tickets] Pass ${ticket.ticket_code} cancelled by attendee. Seat ${ticket.seat_number} released. Refund: ${currSym}${quote.refundAmount} (${quote.refundPercentage}%).`);

    res.json({
      success: true,
      message: `Pass successfully cancelled! Seat ${ticket.seat_number || 'General Entry'} has been released. ${quote.refundAmount > 0 ? `A refund of ${currSym}${quote.refundAmount.toFixed(2)} (${quote.refundPercentage}%) has been issued.` : 'No cancellation fees were incurred.'}`,
      quote,
      currency: currCode,
      currencySymbol: currSym,
      refundTransactionId: refundTxnId,
      previewUrl: emailResult?.previewUrl || null,
      releasedSeat: ticket.seat_number,
    });
  } catch (err) {
    console.error('Error cancelling ticket:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to cancel pass' });
  }
});

module.exports = router;
