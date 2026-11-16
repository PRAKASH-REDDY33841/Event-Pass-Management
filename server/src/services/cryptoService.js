const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'eventpass_prod_super_secret_signing_key_99238472918';
const ISSUER = 'eventpass-authority';

/**
 * Generate a random cryptographic nonce to protect against replay and revoke invalid tokens
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a short, human-readable ticket code (e.g. EP-VIP-8742)
 */
function generateTicketCode(tierName = 'GEN') {
  const prefix = tierName.toUpperCase().slice(0, 3);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `EP-${prefix}-${randomPart}${suffix}`;
}

/**
 * Cryptographically sign a ticket
 */
function signTicketPayload({ ticketId, ticketCode, eventId, attendeeName, attendeeEmail, tierName, seatNumber, paymentStatus, nonce }) {
  const payload = {
    sub: ticketId,
    code: ticketCode,
    eid: eventId,
    name: attendeeName,
    email: attendeeEmail,
    tier: tierName,
    seat: seatNumber || 'GA',
    pay: paymentStatus || 'FREE',
    nonce: nonce,
  };

  return jwt.sign(payload, JWT_SECRET, {
    issuer: ISSUER,
    expiresIn: '90d', // valid through the event lifecycle
  });
}

/**
 * Verify a cryptographically signed ticket token
 */
function verifyTicketToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: ISSUER,
    });
    return { valid: true, payload: decoded };
  } catch (err) {
    let reason = 'Invalid ticket signature';
    if (err.name === 'TokenExpiredError') {
      reason = 'Ticket has expired';
    } else if (err.name === 'JsonWebTokenError') {
      reason = 'Forged or tampered ticket cryptographic signature';
    }
    return { valid: false, error: reason };
  }
}

module.exports = {
  generateNonce,
  generateTicketCode,
  signTicketPayload,
  verifyTicketToken,
  hashPassword,
  verifyPassword,
  generateOrganizerToken,
  verifyOrganizerToken,
};

/**
 * Hash a password using PBKDF2 with a cryptographic salt
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain password against a stored PBKDF2 salt:hash
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }
  const [salt, originalHash] = storedHash.split(':');
  const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(checkHash, 'hex'));
}

/**
 * Generate a JWT session token for an authenticated organizer
 */
function generateOrganizerToken(organizer) {
  return jwt.sign(
    {
      id: organizer.id,
      email: organizer.email,
      name: organizer.name,
      organization: organizer.organization,
      role: organizer.role || 'ORGANIZER',
    },
    JWT_SECRET,
    {
      issuer: ISSUER,
      expiresIn: '7d',
    }
  );
}

/**
 * Verify an organizer JWT session token
 */
function verifyOrganizerToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: ISSUER });
    return { valid: true, organizer: decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

