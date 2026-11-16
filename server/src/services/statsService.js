const db = require('../db');

/**
 * Get comprehensive real-time statistics for an event
 */
function getEventStats(eventId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) return null;

  // Counts
  const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE event_id = ?').get(eventId).count;
  const checkedInTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE event_id = ? AND status = 'CHECKED_IN'").get(eventId).count;
  const revokedTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE event_id = ? AND status = 'REVOKED'").get(eventId).count;

  const validPending = totalTickets - checkedInTickets - revokedTickets;
  const checkInRate = totalTickets > 0 ? Math.round((checkedInTickets / totalTickets) * 100) : 0;

  // Tier breakdown
  const tiers = db.prepare(`
    SELECT 
      tier_name,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'CHECKED_IN' THEN 1 ELSE 0 END) as checked_in
    FROM tickets
    WHERE event_id = ?
    GROUP BY tier_name
  `).all(eventId);

  // Door breakdown
  const doors = db.prepare(`
    SELECT 
      door_name,
      COUNT(*) as count
    FROM check_in_logs
    WHERE event_id = ? AND scan_result = 'SUCCESS'
    GROUP BY door_name
  `).all(eventId);

  // Recent scans (last 20)
  const recentScans = db.prepare(`
    SELECT * FROM check_in_logs
    WHERE event_id = ?
    ORDER BY scanned_at DESC
    LIMIT 20
  `).all(eventId);

  // Check-ins in last 15 minutes (velocity)
  const recentVelocity = db.prepare(`
    SELECT COUNT(*) as count 
    FROM check_in_logs 
    WHERE event_id = ? 
      AND scan_result = 'SUCCESS' 
      AND scanned_at >= datetime('now', '-15 minutes')
  `).get(eventId).count;

  return {
    eventId,
    eventTitle: event.title,
    capacity: event.capacity,
    totalRegistered: totalTickets,
    totalCheckedIn: checkedInTickets,
    pendingCheckIn: validPending,
    revokedCount: revokedTickets,
    checkInRate,
    recentVelocity,
    tiers,
    doors,
    recentScans,
    lastUpdated: new Date().toISOString(),
  };
}

module.exports = {
  getEventStats,
};
