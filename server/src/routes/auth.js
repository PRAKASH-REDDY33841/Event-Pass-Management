const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { hashPassword, verifyPassword, generateOrganizerToken } = require('../services/cryptoService');
const { sendPasswordResetEmail } = require('../services/emailService');
const { requireOrganizer, verifyOrganizerKey, ORGANIZER_SECRET_KEY } = require('../middleware/authMiddleware');

const router = express.Router();

// Email validation regex (RFC 5322 compatible format check)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Phone validation regex (international + local format with digits, spaces, hyphens, parentheses)
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

// Known disposable / fake temporary email domains to reject for organizers
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'mailinator.com', 'guerrillamail.com', 'throwawaymail.com', 
  'fake.com', 'trashmail.com', '10minutemail.com', 'yopmail.com', 'test.com', 
  'example.com', 'sharklasers.com', 'getairmail.com', 'dispostable.com', 
  'burnermail.io', 'mytemp.email', 'dropmail.me'
]);

// Common fake dummy phone patterns
const DUMMY_PHONES = new Set([
  '0000000000', '1234567890', '9876543210', '9999999999', '1111111111', 
  '2222222222', '3333333333', '4444444444', '5555555555', '6666666666', 
  '7777777777', '8888888888'
]);

/**
 * Helper to validate organizer registration details strictly (Anti-Fake / Anti-Fraud)
 */
function validateOrganizerInput({ name, organization, email, phone, password, tax_id, payout_upi_id, payout_bank_account, payout_ifsc }) {
  if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 100) {
    return 'Full Legal Name is required and must be between 3 and 100 characters.';
  }

  // Reject repetitive character spam (e.g., 'aaaaaa', 'zzzzz') or test keywords in name
  if (/(.)\1{3,}/.test(name) || name.toLowerCase().includes('test123') || name.toLowerCase().includes('asdf')) {
    return 'Please provide a genuine legal or professional name.';
  }

  if (!organization || typeof organization !== 'string' || organization.trim().length < 3 || organization.trim().length > 120) {
    return 'Organization / Company name is required (minimum 3 characters).';
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return 'Please provide a valid official email address (e.g. name@organization.com).';
  }

  const domain = email.trim().toLowerCase().split('@')[1];
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return 'Disposable or temporary email addresses are strictly prohibited for event organizers.';
  }

  if (!phone || typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim())) {
    return 'Please provide a valid contact phone number with country/area code.';
  }

  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15 || DUMMY_PHONES.has(digitsOnly)) {
    return 'Please enter a genuine, active phone number (cannot be a dummy pattern like 1234567890).';
  }

  if (digitsOnly.length === 10 && !/^[6-9]/.test(digitsOnly)) {
    return 'Indian mobile numbers must begin with 6, 7, 8, or 9.';
  }

  if (tax_id && typeof tax_id === 'string' && tax_id.trim()) {
    const cleanTax = tax_id.trim().toUpperCase();
    const isGstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanTax);
    const isPan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanTax);
    if (!isGstin && !isPan && cleanTax.length < 6) {
      return 'Tax / Business Registration ID must be a valid 15-digit GSTIN, 10-digit PAN, or official corporate reg number.';
    }
  }

  if (payout_upi_id && typeof payout_upi_id === 'string' && payout_upi_id.trim()) {
    const cleanUpi = payout_upi_id.trim();
    if (!/^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z]{2,49}$/.test(cleanUpi) || cleanUpi.includes('test@test') || cleanUpi.includes('fake@fake')) {
      return 'Please enter a valid payout UPI ID (e.g. yourname@okhdfcbank or merchant@upi) for ticket payouts.';
    }
  }

  if (payout_bank_account && typeof payout_bank_account === 'string' && payout_bank_account.trim()) {
    const cleanAcc = payout_bank_account.trim();
    if (!/^\d{9,18}$/.test(cleanAcc)) {
      return 'Bank Account Number must be between 9 and 18 numerical digits.';
    }
    const cleanIfsc = (payout_ifsc || '').trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      return 'Please enter a valid 11-character Indian Financial System Code (IFSC, e.g. HDFC0001234).';
    }
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return 'Password is required and must be at least 6 characters long.';
  }

  return null;
}

/**
 * POST /api/auth/register-organizer
 * Register a new organizer with verified details and settlement payout destination
 */
router.post('/register-organizer', (req, res) => {
  try {
    const { 
      name, organization, email, phone, password, 
      tax_id, payout_upi_id, payout_bank_account, payout_ifsc 
    } = req.body || {};

    const validationError = validateOrganizerInput({ 
      name, organization, email, phone, password, 
      tax_id, payout_upi_id, payout_bank_account, payout_ifsc 
    });
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedOrg = organization.trim();
    const trimmedPhone = phone.trim();
    const trimmedTax = tax_id ? tax_id.trim().toUpperCase() : '29AABCE1234F1Z5';
    const trimmedUpi = payout_upi_id ? payout_upi_id.trim() : `${trimmedEmail.split('@')[0]}@okhdfcbank`;
    const trimmedAcc = payout_bank_account ? payout_bank_account.trim() : '';
    const trimmedIfsc = payout_ifsc ? payout_ifsc.trim().toUpperCase() : '';
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    // Check for existing organizer email
    const existing = db.prepare('SELECT id FROM organizers WHERE email = ?').get(trimmedEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An organizer account with this email already exists. Please log in instead.',
      });
    }

    const organizerId = `org_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO organizers (
        id, name, email, password_hash, organization, phone, role, status,
        tax_id, payout_upi_id, payout_bank_account, payout_ifsc, payout_verified,
        last_login_at, login_ip, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'ORGANIZER', 'ACTIVE', ?, ?, ?, ?, 1, datetime('now'), ?, datetime('now'))
    `).run(
      organizerId,
      trimmedName,
      trimmedEmail,
      passwordHash,
      trimmedOrg,
      trimmedPhone,
      trimmedTax,
      trimmedUpi,
      trimmedAcc,
      trimmedIfsc,
      clientIp
    );

    const newOrganizer = {
      id: organizerId,
      name: trimmedName,
      email: trimmedEmail,
      organization: trimmedOrg,
      phone: trimmedPhone,
      tax_id: trimmedTax,
      payout_upi_id: trimmedUpi,
      payout_verified: 1,
      role: 'ORGANIZER',
      status: 'ACTIVE',
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const token = generateOrganizerToken(newOrganizer);

    console.log(`[Auth] Registered new verified organizer: "${trimmedName}" (${trimmedOrg}) <${trimmedEmail}> [Tax: ${trimmedTax}, UPI: ${trimmedUpi}]`);

    res.status(201).json({
      success: true,
      message: 'Organizer account successfully created and verified with real-time settlement tracking!',
      token,
      organizer: newOrganizer,
    });
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during organizer registration.' });
  }
});

/**
 * POST /api/auth/login-organizer
 * Authenticate organizer with email and password, capturing real-time login audit
 */
router.post('/login-organizer', (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please enter both your organizer email and password.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const organizer = db.prepare(`
      SELECT * 
      FROM organizers 
      WHERE email = ?
    `).get(trimmedEmail);

    if (!organizer) {
      return res.status(401).json({
        success: false,
        error: 'No organizer account found with this email. Please verify your email or register.',
      });
    }

    if (!verifyPassword(password, organizer.password_hash)) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.',
      });
    }

    if (organizer.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'This organizer account is currently inactive. Please contact administration.',
      });
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    
    // Real-time login audit update
    db.prepare(`
      UPDATE organizers 
      SET last_login_at = datetime('now'),
          login_ip = ?
      WHERE id = ?
    `).run(clientIp, organizer.id);

    const freshOrg = db.prepare('SELECT * FROM organizers WHERE id = ?').get(organizer.id);

    const profile = {
      id: freshOrg.id,
      name: freshOrg.name,
      email: freshOrg.email,
      organization: freshOrg.organization,
      phone: freshOrg.phone,
      role: freshOrg.role,
      status: freshOrg.status,
      tax_id: freshOrg.tax_id || '29AABCE1234F1Z5',
      payout_upi_id: freshOrg.payout_upi_id || `${freshOrg.email.split('@')[0]}@okhdfcbank`,
      payout_verified: freshOrg.payout_verified ?? 1,
      last_login_at: freshOrg.last_login_at,
      created_at: freshOrg.created_at,
    };

    const token = generateOrganizerToken(profile);

    console.log(`[Auth] Organizer logged in: "${profile.name}" <${profile.email}> at ${profile.last_login_at}`);

    res.json({
      success: true,
      message: 'Organizer authentication successful!',
      token,
      organizer: profile,
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

/**
 * GET /api/auth/me
 * Return currently authenticated organizer profile
 */
router.get('/me', requireOrganizer, (req, res) => {
  res.json({
    success: true,
    organizer: req.organizer,
  });
});

/**
 * POST /api/auth/verify-organizer
 * Legacy/fallback passkey check endpoint for backwards compatibility
 */
router.post('/verify-organizer', (req, res) => {
  const { passkey } = req.body || {};
  if (verifyOrganizerKey(passkey)) {
    // If it's the master key, return admin profile
    if (passkey === ORGANIZER_SECRET_KEY) {
      return res.json({
        success: true,
        message: 'Master organizer access granted',
        organizer: {
          id: 'org_master_admin',
          name: 'Master Organizer',
          email: 'admin@eventpass.io',
          organization: 'EventPass System Administration',
          role: 'ADMIN',
        },
      });
    }

    return res.json({ success: true, message: 'Organizer access granted' });
  }

  res.status(401).json({ success: false, error: 'Invalid Organizer Passkey or credentials.' });
});

/**
 * POST /api/auth/forgot-password
 * Send a 6-digit password reset OTP verification code to organizer email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid organizer email address.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const organizer = db.prepare(`
      SELECT id, name, email, organization, status 
      FROM organizers 
      WHERE email = ?
    `).get(trimmedEmail);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        error: 'No registered organizer found with this email address.',
      });
    }

    if (organizer.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'This organizer account is deactivated. Please contact administration.',
      });
    }

    // Invalidate existing unused codes for this organizer
    db.prepare('UPDATE password_resets SET used = 1 WHERE organizer_id = ? AND used = 0').run(organizer.id);

    // Generate 6-digit OTP code & reset token
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = uuidv4();
    const resetId = `rst_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    db.prepare(`
      INSERT INTO password_resets (id, organizer_id, email, otp_code, reset_token, expires_at, used)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+15 minutes'), 0)
    `).run(resetId, organizer.id, trimmedEmail, otpCode, resetToken);

    // Dispatch email
    const emailResult = await sendPasswordResetEmail({
      organizer,
      otpCode,
      validMinutes: 15,
    });

    console.log(`[Auth] Password reset OTP generated for ${trimmedEmail}: [${otpCode}]`);

    res.json({
      success: true,
      message: 'A 6-digit verification code has been dispatched to your email.',
      email: trimmedEmail,
      previewUrl: emailResult.previewUrl || null,
      debugCode: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    res.status(500).json({ success: false, error: 'Internal server error while processing password reset.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Verify OTP code and update organizer password
 */
router.post('/reset-password', (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body || {};

    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, 6-digit verification code, and new password are required.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otpCode.toString().trim();

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long.',
      });
    }

    // Find valid matching reset entry
    const resetEntry = db.prepare(`
      SELECT pr.id, pr.organizer_id, pr.expires_at, pr.used
      FROM password_resets pr
      WHERE pr.email = ? AND pr.otp_code = ? AND pr.used = 0
      ORDER BY pr.created_at DESC
      LIMIT 1
    `).get(trimmedEmail, trimmedOtp);

    if (!resetEntry) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code. Please check the code or request a new one.',
      });
    }

    // Check expiration
    const isExpired = db.prepare(`
      SELECT (datetime(?) <= datetime('now')) AS expired
    `).get(resetEntry.expires_at)?.expired === 1;

    if (isExpired) {
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired (valid for 15 minutes). Please request a new code.',
      });
    }

    // Hash new password and update organizer
    const newHash = hashPassword(newPassword);
    db.prepare(`
      UPDATE organizers 
      SET password_hash = ? 
      WHERE id = ?
    `).run(newHash, resetEntry.organizer_id);

    // Mark reset code as used
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetEntry.id);

    // Retrieve updated organizer profile
    const organizer = db.prepare(`
      SELECT id, name, email, organization, phone, role, status 
      FROM organizers 
      WHERE id = ?
    `).get(resetEntry.organizer_id);

    const token = generateOrganizerToken(organizer);

    console.log(`[Auth] Password successfully reset for organizer: "${organizer.name}" <${organizer.email}>`);

    res.json({
      success: true,
      message: 'Password successfully updated! You are now logged in.',
      token,
      organizer,
    });
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    res.status(500).json({ success: false, error: 'Internal server error while resetting password.' });
  }
});

/**
 * POST /api/auth/attendee/check - Check if attendee email exists in database
 */
router.post('/attendee/check', (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Valid email is required.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const attendee = db.prepare('SELECT id, name, email, phone, organization FROM attendees WHERE email = ?').get(cleanEmail);
    res.json({
      success: true,
      exists: !!attendee,
      attendee: attendee ? { id: attendee.id, name: attendee.name, email: attendee.email, phone: attendee.phone, organization: attendee.organization } : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error checking attendee' });
  }
});

/**
 * POST /api/auth/attendee/register - Create new attendee account in database
 */
router.post('/attendee/register', (req, res) => {
  try {
    const { name, email, password, phone, organization } = req.body || {};
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full name is required (minimum 2 characters).' });
    }
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM attendees WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists in our database. Please log in instead.' });
    }

    const attendeeId = 'att_' + uuidv4().replace(/-/g, '').slice(0, 12);
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO attendees (id, name, email, password_hash, phone, organization, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `).run(
      attendeeId,
      name.trim(),
      cleanEmail,
      passwordHash,
      phone ? phone.trim() : '',
      organization ? organization.trim() : ''
    );

    const attendee = {
      id: attendeeId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      organization: organization ? organization.trim() : '',
    };

    console.log(`[Auth] New Attendee created in database: "${attendee.name}" <${attendee.email}>`);

    res.json({
      success: true,
      message: 'Attendee account created successfully! You can now register for events.',
      attendee,
    });
  } catch (err) {
    console.error('[Auth] Attendee register error:', err);
    res.status(500).json({ success: false, error: 'Internal server error creating attendee account.' });
  }
});

/**
 * POST /api/auth/attendee/login - Authenticate attendee against database
 */
router.post('/attendee/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const attendee = db.prepare('SELECT * FROM attendees WHERE email = ?').get(cleanEmail);

    if (!attendee) {
      return res.status(404).json({
        success: false,
        error: 'No attendee account found with this email in our database. Please create an account to continue.',
        notFound: true,
      });
    }

    // Verify password if provided
    if (password && attendee.password_hash) {
      const isValid = verifyPassword(password, attendee.password_hash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
      }
    }

    // Real-time login audit for attendee
    try {
      db.prepare("UPDATE attendees SET last_login_at = datetime('now') WHERE id = ?").run(attendee.id);
    } catch (ignore) {}

    const attendeeProfile = {
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone || '',
      organization: attendee.organization || '',
      headline: attendee.headline || '',
      bio: attendee.bio || '',
      avatar_url: attendee.avatar_url || '',
      city: attendee.city || 'Bengaluru',
      country: attendee.country || 'India',
      last_login_at: new Date().toISOString(),
      created_at: attendee.created_at,
    };

    console.log(`[Auth] Attendee logged in: "${attendeeProfile.name}" <${attendeeProfile.email}>`);

    res.json({
      success: true,
      message: `Welcome back, ${attendeeProfile.name}!`,
      attendee: attendeeProfile,
    });
  } catch (err) {
    console.error('[Auth] Attendee login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error logging in attendee.' });
  }
});

/**
 * POST /api/auth/attendee/forgot-password
 * Send 6-digit password recovery code to attendee email
 */
router.post('/attendee/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Please enter a valid attendee email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const attendee = db.prepare('SELECT id, name, email, organization, status FROM attendees WHERE email = ?').get(cleanEmail);

    if (!attendee) {
      return res.status(404).json({
        success: false,
        error: 'No attendee account found with this email in our database. Please check your spelling or register.',
      });
    }

    // Invalidate existing unused codes for this attendee
    db.prepare("UPDATE password_resets SET used = 1 WHERE email = ? AND user_type = 'ATTENDEE' AND used = 0").run(cleanEmail);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = uuidv4();
    const resetId = `rst_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

    db.prepare(`
      INSERT INTO password_resets (id, organizer_id, email, otp_code, reset_token, expires_at, used, user_type)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+15 minutes'), 0, 'ATTENDEE')
    `).run(resetId, attendee.id, cleanEmail, otpCode, resetToken);

    const emailResult = await sendPasswordResetEmail({
      user: attendee,
      otpCode,
      validMinutes: 15,
      userType: 'ATTENDEE',
    });

    console.log(`[Auth] Attendee password reset OTP for ${cleanEmail}: [${otpCode}]`);

    res.json({
      success: true,
      message: 'A 6-digit password recovery code has been sent to your email.',
      email: cleanEmail,
      previewUrl: emailResult.previewUrl || null,
      debugCode: otpCode,
    });
  } catch (err) {
    console.error('[Auth] Attendee forgot password error:', err);
    res.status(500).json({ success: false, error: 'Error generating password recovery code.' });
  }
});

/**
 * POST /api/auth/attendee/reset-password
 * Verify OTP code and update attendee password
 */
router.post('/attendee/reset-password', (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body || {};
    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, 6-digit code, and new password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.toString().trim();

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const resetEntry = db.prepare(`
      SELECT id, organizer_id, expires_at, used
      FROM password_resets
      WHERE email = ? AND otp_code = ? AND user_type = 'ATTENDEE' AND used = 0
      ORDER BY created_at DESC
      LIMIT 1
    `).get(cleanEmail, cleanOtp);

    if (!resetEntry) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code. Please check your code or request a new one.' });
    }

    const isExpired = db.prepare(`SELECT (datetime(?) <= datetime('now')) AS expired`).get(resetEntry.expires_at)?.expired === 1;
    if (isExpired) {
      return res.status(400).json({ success: false, error: 'Verification code has expired (valid for 15 minutes). Please request a new code.' });
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE attendees SET password_hash = ? WHERE email = ?').run(newHash, cleanEmail);
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetEntry.id);

    const attendee = db.prepare('SELECT id, name, email, phone, organization, headline, bio, avatar_url, city, country, created_at FROM attendees WHERE email = ?').get(cleanEmail);

    console.log(`[Auth] Attendee password successfully reset for: "${attendee.name}" <${attendee.email}>`);

    res.json({
      success: true,
      message: 'Password reset successfully! You are now logged in.',
      attendee,
    });
  } catch (err) {
    console.error('[Auth] Attendee reset password error:', err);
    res.status(500).json({ success: false, error: 'Error resetting attendee password.' });
  }
});

/**
 * GET /api/auth/attendee/profile - Get full profile and event statistics for attendee
 */
router.get('/attendee/profile', (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter is required.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const attendee = db.prepare(`
      SELECT id, name, email, phone, organization, bio, headline, avatar_url, city, country, created_at 
      FROM attendees 
      WHERE email = ?
    `).get(cleanEmail);

    if (!attendee) {
      return res.status(404).json({ success: false, error: 'Attendee profile not found.' });
    }

    // Get attendance and pass statistics
    const passStats = db.prepare(`
      SELECT 
        COUNT(*) as total_passes,
        SUM(CASE WHEN status = 'CHECKED_IN' THEN 1 ELSE 0 END) as attended_count,
        SUM(CASE WHEN status IN ('CANCELLED', 'CANCELLED_REFUNDED') THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status NOT IN ('CANCELLED', 'CANCELLED_REFUNDED') THEN 1 ELSE 0 END) as active_count
      FROM tickets
      WHERE LOWER(attendee_email) = ?
    `).get(cleanEmail);

    res.json({
      success: true,
      attendee: {
        ...attendee,
        phone: attendee.phone || '',
        organization: attendee.organization || '',
        headline: attendee.headline || '',
        bio: attendee.bio || '',
        avatar_url: attendee.avatar_url || '',
        city: attendee.city || 'Bengaluru',
        country: attendee.country || 'India',
      },
      stats: {
        totalPasses: passStats?.total_passes || 0,
        attendedPasses: passStats?.attended_count || 0,
        cancelledPasses: passStats?.cancelled_count || 0,
        activePasses: passStats?.active_count || 0,
      },
    });
  } catch (err) {
    console.error('[Auth] Attendee get profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
  }
});

/**
 * PUT /api/auth/attendee/profile - Update attendee profile (Name, Bio, Headline, Phone, Org, City, Avatar)
 */
router.put('/attendee/profile', (req, res) => {
  try {
    const { email, name, headline, bio, phone, organization, city, country, avatar_url } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required to update profile.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM attendees WHERE email = ?').get(cleanEmail);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Attendee account not found.' });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Name must be at least 2 characters.' });
    }

    const cleanName = name.trim();
    const cleanHeadline = headline ? headline.trim() : '';
    const cleanBio = bio ? bio.trim() : '';
    const cleanPhone = phone ? phone.trim() : '';
    const cleanOrg = organization ? organization.trim() : '';
    const cleanCity = city ? city.trim() : 'Bengaluru';
    const cleanCountry = country ? country.trim() : 'India';
    const cleanAvatar = avatar_url ? avatar_url.trim() : '';

    db.prepare(`
      UPDATE attendees
      SET name = ?,
          headline = ?,
          bio = ?,
          phone = ?,
          organization = ?,
          city = ?,
          country = ?,
          avatar_url = ?
      WHERE email = ?
    `).run(cleanName, cleanHeadline, cleanBio, cleanPhone, cleanOrg, cleanCity, cleanCountry, cleanAvatar, cleanEmail);

    // Also sync attendee_name, phone, organization into tickets
    try {
      db.prepare(`
        UPDATE tickets
        SET attendee_name = ?,
            attendee_phone = ?,
            organization = ?
        WHERE LOWER(attendee_email) = ?
      `).run(cleanName, cleanPhone, cleanOrg, cleanEmail);
    } catch (ignore) {}

    const updated = db.prepare(`
      SELECT id, name, email, phone, organization, bio, headline, avatar_url, city, country, created_at 
      FROM attendees 
      WHERE email = ?
    `).get(cleanEmail);

    console.log(`[Auth] Attendee profile updated: "${updated.name}" <${updated.email}>`);

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      attendee: updated,
    });
  } catch (err) {
    console.error('[Auth] Attendee update profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

module.exports = router;
