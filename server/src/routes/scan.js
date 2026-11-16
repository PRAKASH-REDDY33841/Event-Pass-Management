const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { verifyTicketToken } = require('../services/cryptoService');
const { getEventStats } = require('../services/statsService');

const router = express.Router();

function getIO(req) {
  return req.app.get('io');
}

/**
 * POST /api/scan/verify - Verify ticket scanned by volunteer camera or manual code
 */
router.post('/verify', (req, res) => {
  try {
    const { codeOrToken, eventId, doorName = 'Main Entrance Gate A', volunteerName = 'Volunteer Staff' } = req.body;

    if (!codeOrToken) {
      return res.status(400).json({
        status: 'ERROR',
        title: 'Empty Scan',
        message: 'No QR code or ticket code received.',
      });
    }

    const trimmedInput = codeOrToken.trim();
    let ticket = null;
    let isJwt = trimmedInput.startsWith('eyJ') || trimmedInput.split('.').length === 3;

    if (isJwt) {
      // 1. Cryptographic Signature Verification
      const verifyResult = verifyTicketToken(trimmedInput);
      if (!verifyResult.valid) {
        // Log counterfeit attempt
        db.prepare(`
          INSERT INTO check_in_logs (id, ticket_id, ticket_code, event_id, attendee_name, tier_name, door_name, scanned_by, scan_result, scan_message, scanned_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          'log_' + uuidv4().slice(0, 8),
          'UNKNOWN',
          'FORGED_QR',
          eventId || 'UNKNOWN',
          'Unknown Suspect',
          'N/A',
          doorName,
          volunteerName,
          'INVALID_SIGNATURE',
          `Tampered signature: ${verifyResult.error}`
        );

        return res.status(400).json({
          status: 'INVALID_SIGNATURE',
          title: 'Tampered / Counterfeit Ticket',
          message: `Cryptographic signature check failed: ${verifyResult.error}. This QR code is counterfeit or corrupted.`,
        });
      }

      const payload = verifyResult.payload;
      ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(payload.sub);

      if (!ticket) {
        return res.status(404).json({
          status: 'NOT_FOUND',
          title: 'Ticket Not Found',
          message: 'The ticket ID in this QR code does not exist in the database.',
        });
      }

      // Check nonce to ensure token wasn't revoked
      if (ticket.signature_nonce !== payload.nonce) {
        return res.status(403).json({
          status: 'REVOKED',
          title: 'Ticket Token Invalidated',
          message: 'This ticket token has been revoked or re-issued.',
        });
      }
    } else {
      // Manual ticket code lookup (e.g. EP-VIP-1001)
      ticket = db.prepare('SELECT * FROM tickets WHERE ticket_code = ? OR id = ?').get(trimmedInput, trimmedInput);

      if (!ticket) {
        return res.status(404).json({
          status: 'NOT_FOUND',
          title: 'Code Not Recognized',
          message: `No ticket found matching "${trimmedInput}". Please check spelling.`,
        });
      }
    }

    // 2. Check Event Matching
    if (eventId && ticket.event_id !== eventId) {
      const ticketEvent = db.prepare('SELECT title FROM events WHERE id = ?').get(ticket.event_id);
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
        doorName,
        volunteerName,
        'EVENT_MISMATCH',
        `Ticket is for "${ticketEvent ? ticketEvent.title : 'different event'}"`
      );

      return res.status(400).json({
        status: 'EVENT_MISMATCH',
        title: 'Wrong Event',
        message: `This pass is for "${ticketEvent ? ticketEvent.title : 'another event'}", not the currently selected event!`,
        ticket,
      });
    }

    // 3. Check Revoked Status
    if (ticket.status === 'REVOKED') {
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
        doorName,
        volunteerName,
        'REVOKED',
        'Attempted check-in with revoked pass'
      );

      return res.status(403).json({
        status: 'REVOKED',
        title: 'Ticket Revoked',
        message: 'This pass has been formally REVOKED by event organizers. Admittance denied.',
        ticket,
      });
    }

    // 3b. Check Cancelled / Refunded Status
    if (ticket.status === 'CANCELLED_REFUNDED' || ticket.status === 'CANCELLED') {
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
        doorName,
        volunteerName,
        'CANCELLED_REFUNDED',
        `Attempted check-in with cancelled/refunded pass (Refund: $${ticket.refund_amount || ticket.payment_amount})`
      );

      return res.status(403).json({
        status: 'CANCELLED_REFUNDED',
        title: 'Event Cancelled & Pass Refunded',
        message: `This pass is inactive. The event was cancelled and a full refund ($${Number(ticket.refund_amount || ticket.payment_amount).toFixed(2)}) was processed. Admittance denied.`,
        ticket,
      });
    }

    // 4. Check Duplicate Check-In
    if (ticket.status === 'CHECKED_IN') {
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
        doorName,
        volunteerName,
        'DUPLICATE',
        `Duplicate scan. First scanned at ${ticket.checked_in_at} by ${ticket.checked_in_by || 'Staff'}`
      );

      return res.status(409).json({
        status: 'DUPLICATE',
        title: 'Already Admitted!',
        message: `This pass was ALREADY checked in at ${new Date(ticket.checked_in_at).toLocaleTimeString()} at ${ticket.check_in_door || 'Entrance'} by ${ticket.checked_in_by || 'Staff'}.`,
        ticket,
      });
    }

    // 5. Valid Ticket -> Grant Entry!
    const checkInTime = new Date().toISOString();
    db.prepare(`
      UPDATE tickets 
      SET status = 'CHECKED_IN', checked_in_at = ?, checked_in_by = ?, check_in_door = ?
      WHERE id = ?
    `).run(checkInTime, volunteerName, doorName, ticket.id);

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
      doorName,
      volunteerName,
      'SUCCESS',
      'Cryptographic signature verified and pass validated.',
      checkInTime
    );

    const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);

    // Broadcast live update over Socket.io
    const io = getIO(req);
    if (io) {
      const stats = getEventStats(ticket.event_id);
      io.to(`event_${ticket.event_id}`).emit('stats:updated', stats);
      io.to(`event_${ticket.event_id}`).emit('ticket:checked_in', {
        ticket: updatedTicket,
        doorName,
        volunteerName,
        scannedAt: checkInTime,
      });
    }

    return res.json({
      status: 'SUCCESS',
      title: 'Access Granted! 🎉',
      message: `Verified: ${updatedTicket.attendee_name} (${updatedTicket.tier_name})`,
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error('Scan verification error:', err);
    res.status(500).json({
      status: 'ERROR',
      title: 'Verification Error',
      message: err.message || 'Server error during scan verification',
    });
  }
});

module.exports = router;
