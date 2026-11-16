const db = require('../db');
const { verifyOrganizerToken } = require('../services/cryptoService');

const ORGANIZER_SECRET_KEY = process.env.ORGANIZER_KEY || 'eventpass2026';

/**
 * Middleware to protect organizer-only routes (create event, reschedule, delete, revoke)
 */
function requireOrganizer(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    token = req.headers['x-organizer-token'] || req.headers['x-organizer-key'] || req.query.organizer_key;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access Denied: Organizer authentication required. Please sign in or register with valid organizer credentials.',
    });
  }

  // 1. Check if token is a valid JWT session token
  const tokenResult = verifyOrganizerToken(token);
  if (tokenResult.valid && tokenResult.organizer) {
    try {
      const organizer = db.prepare('SELECT id, name, email, organization, phone, role, status FROM organizers WHERE id = ?').get(tokenResult.organizer.id);
      if (!organizer) {
        return res.status(401).json({ success: false, error: 'Organizer account not found or removed.' });
      }
      if (organizer.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, error: 'Organizer account is suspended or inactive.' });
      }
      req.organizer = organizer;
      return next();
    } catch (dbErr) {
      console.error('[AuthMiddleware] DB lookup error:', dbErr);
    }
  }

  // 2. Check if token matches the master passkey (for administrative override / developer fallback)
  if (token === ORGANIZER_SECRET_KEY) {
    const primaryAdmin = db.prepare('SELECT id, name, email, organization, phone, role, status FROM organizers ORDER BY rowid ASC LIMIT 1').get();
    req.organizer = primaryAdmin || {
      id: 'org_verified_lead_2026',
      name: 'Master Organizer (Admin)',
      email: 'organizer@eventpass.io',
      organization: 'Platform Administration',
      phone: '+1 (555) 000-0000',
      role: 'ADMIN',
      status: 'ACTIVE',
    };
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access Denied: Invalid or expired organizer credentials. Please log in with a registered organizer account.',
  });
}

/**
 * Helper to check if a passkey matches the organizer key
 */
function verifyOrganizerKey(key) {
  if (!key) return false;
  if (key === ORGANIZER_SECRET_KEY) return true;
  const tokenResult = verifyOrganizerToken(key);
  return tokenResult.valid;
}

module.exports = {
  requireOrganizer,
  verifyOrganizerKey,
  ORGANIZER_SECRET_KEY,
};

