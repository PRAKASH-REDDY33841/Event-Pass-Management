const express = require('express');
const db = require('../db');
const { getEventStats } = require('../services/statsService');

const router = express.Router();

/**
 * GET /api/stats/global - Aggregated stats across all events (for intro page / admin)
 */
router.get('/global', (req, res) => {
  try {
    const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
    const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status != ?').get('REVOKED').count;
    const totalCheckedIn = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'CHECKED_IN'").get().count;
    const totalRevoked = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'REVOKED'").get().count;
    const totalOrganizers = db.prepare("SELECT COUNT(*) as count FROM organizers WHERE status = 'ACTIVE'").get().count;
    const totalScans = db.prepare('SELECT COUNT(*) as count FROM check_in_logs').get().count;
    const invalidScans = db.prepare("SELECT COUNT(*) as count FROM check_in_logs WHERE scan_result NOT IN ('SUCCESS', 'DUPLICATE')").get().count;
    const checkInRate = totalTickets > 0 ? Math.round((totalCheckedIn / totalTickets) * 100) : 0;

    res.json({
      success: true,
      stats: {
        totalEvents,
        totalTickets,
        totalCheckedIn,
        totalRevoked,
        totalOrganizers,
        totalScans,
        invalidScans,
        checkInRate,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error fetching global stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch global stats' });
  }
});

/**
 * GET /api/stats/:eventId - Get real-time stats for the live dashboard
 */
router.get('/:eventId', (req, res) => {
  try {
    const stats = getEventStats(req.params.eventId);
    if (!stats) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching event stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch event stats' });
  }
});

module.exports = router;
