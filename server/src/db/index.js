const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/eventpass.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Conference',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      location TEXT NOT NULL,
      venue_name TEXT NOT NULL,
      banner_url TEXT,
      capacity INTEGER NOT NULL DEFAULT 500,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ticket_tiers (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0.0,
      capacity INTEGER NOT NULL DEFAULT 100,
      perks TEXT DEFAULT '[]',
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_code TEXT UNIQUE NOT NULL,
      event_id TEXT NOT NULL,
      tier_id TEXT,
      tier_name TEXT NOT NULL DEFAULT 'General Admission',
      attendee_name TEXT NOT NULL,
      attendee_email TEXT NOT NULL,
      attendee_phone TEXT,
      organization TEXT,
      status TEXT NOT NULL DEFAULT 'VALID',
      signature_nonce TEXT NOT NULL,
      jwt_token TEXT NOT NULL,
      checked_in_at TEXT,
      checked_in_by TEXT,
      check_in_door TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS check_in_logs (
      id TEXT PRIMARY KEY,
      ticket_id TEXT,
      ticket_code TEXT,
      event_id TEXT NOT NULL,
      attendee_name TEXT,
      tier_name TEXT,
      door_name TEXT NOT NULL,
      scanned_by TEXT NOT NULL,
      scan_result TEXT NOT NULL,
      scan_message TEXT,
      scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_outbox (
      id TEXT PRIMARY KEY,
      ticket_id TEXT,
      to_email TEXT NOT NULL,
      to_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      html_content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SENT',
      preview_url TEXT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organizers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      organization TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ORGANIZER',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      organization TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      organizer_id TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      otp_code TEXT NOT NULL,
      reset_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scheduled_notifications (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      ticket_code TEXT NOT NULL,
      event_id TEXT NOT NULL,
      attendee_name TEXT NOT NULL,
      attendee_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      notification_type TEXT NOT NULL DEFAULT '5_HOUR_REMINDER',
      scheduled_for TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      sent_at TEXT,
      preview_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_organizers_email ON organizers(email);
    CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
    CREATE INDEX IF NOT EXISTS idx_password_resets_otp ON password_resets(otp_code);
    CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status, scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
    CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_logs_event ON check_in_logs(event_id);
    CREATE INDEX IF NOT EXISTS idx_logs_time ON check_in_logs(scanned_at);
  `);

  const columnsToAdd = [
    `ALTER TABLE events ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'`,
    `ALTER TABLE events ADD COLUMN cancellation_reason TEXT`,
    `ALTER TABLE events ADD COLUMN organizer_id TEXT REFERENCES organizers(id)`,
    `ALTER TABLE events ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR'`,
    `ALTER TABLE events ADD COLUMN country TEXT NOT NULL DEFAULT 'India'`,
    `ALTER TABLE events ADD COLUMN city TEXT NOT NULL DEFAULT 'Bengaluru'`,
    `ALTER TABLE events ADD COLUMN latitude REAL DEFAULT 12.9716`,
    `ALTER TABLE events ADD COLUMN longitude REAL DEFAULT 77.5946`,
    `ALTER TABLE tickets ADD COLUMN seat_number TEXT`,
    `ALTER TABLE tickets ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'FREE'`,
    `ALTER TABLE tickets ADD COLUMN payment_amount REAL NOT NULL DEFAULT 0.0`,
    `ALTER TABLE tickets ADD COLUMN payment_method TEXT`,
    `ALTER TABLE tickets ADD COLUMN transaction_id TEXT`,
    `ALTER TABLE tickets ADD COLUMN paid_at TEXT`,
    `ALTER TABLE tickets ADD COLUMN refund_amount REAL DEFAULT 0.0`,
    `ALTER TABLE tickets ADD COLUMN refund_transaction_id TEXT`,
    `ALTER TABLE tickets ADD COLUMN refunded_at TEXT`,
    `ALTER TABLE tickets ADD COLUMN cancellation_fee REAL DEFAULT 0.0`,
    `ALTER TABLE tickets ADD COLUMN refund_percentage INTEGER DEFAULT 100`,
    `ALTER TABLE tickets ADD COLUMN cancellation_reason TEXT`,
    `ALTER TABLE tickets ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR'`,
    `ALTER TABLE attendees ADD COLUMN bio TEXT`,
    `ALTER TABLE attendees ADD COLUMN avatar_url TEXT`,
    `ALTER TABLE attendees ADD COLUMN city TEXT DEFAULT 'Bengaluru'`,
    `ALTER TABLE attendees ADD COLUMN country TEXT DEFAULT 'India'`,
    `ALTER TABLE attendees ADD COLUMN headline TEXT`,
    `ALTER TABLE attendees ADD COLUMN last_login_at TEXT`,
    `ALTER TABLE password_resets ADD COLUMN user_type TEXT NOT NULL DEFAULT 'ORGANIZER'`,
    `ALTER TABLE organizers ADD COLUMN tax_id TEXT`,
    `ALTER TABLE organizers ADD COLUMN payout_upi_id TEXT`,
    `ALTER TABLE organizers ADD COLUMN payout_bank_account TEXT`,
    `ALTER TABLE organizers ADD COLUMN payout_ifsc TEXT`,
    `ALTER TABLE organizers ADD COLUMN payout_verified INTEGER DEFAULT 1`,
    `ALTER TABLE organizers ADD COLUMN last_login_at TEXT`,
    `ALTER TABLE organizers ADD COLUMN login_ip TEXT`,
    `ALTER TABLE events ADD COLUMN organizer_name TEXT`,
    `ALTER TABLE events ADD COLUMN organizer_organization TEXT`,
    `ALTER TABLE events ADD COLUMN organizer_payout_target TEXT`,
  ];

  for (const sql of columnsToAdd) {
    try {
      db.exec(sql);
    } catch (err) {
      // Column already exists
    }
  }

  // Auto-populate attendees table from existing tickets if not yet seeded
  try {
    const existingTicketAttendees = db.prepare(`
      SELECT DISTINCT 
        LOWER(attendee_email) as email, 
        attendee_name as name, 
        attendee_phone as phone, 
        organization
      FROM tickets 
      WHERE attendee_email IS NOT NULL AND attendee_email != ''
    `).all();

    const insertAttendee = db.prepare(`
      INSERT OR IGNORE INTO attendees (id, name, email, password_hash, phone, organization)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Standard hash for test password 'Pass123!'
    const defaultHash = 'b6f6d6c99f921f00885e3a8934dbd356:6e01a1c8f498c56fa76307fa9b27a37213400aef1f6361a9ba4ce46ceb0bda7e313c4c92cb00a294870c2a297926b4291a136b6cb6002f54070a927e7ca4be5f';

    for (const a of existingTicketAttendees) {
      const id = 'att_' + Buffer.from(a.email).toString('hex').slice(0, 12);
      insertAttendee.run(id, a.name || 'Attendee', a.email, defaultHash, a.phone || '', a.organization || '');
    }
  } catch (seedErr) {
    console.warn('[DB] Attendee seed check notice:', seedErr.message);
  }
}

initSchema();

module.exports = db;
