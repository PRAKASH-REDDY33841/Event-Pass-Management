const { v4: uuidv4 } = require('uuid');
const db = require('./index');
const { generateTicketCode, generateNonce, signTicketPayload, hashPassword } = require('../services/cryptoService');

const DEFAULT_ORGANIZER = {
  id: 'org_verified_lead_2026',
  name: 'Alex Rivera',
  email: 'organizer@eventpass.io',
  password: 'Organizer2026!',
  organization: 'Global Tech Events Consortium',
  phone: '+1 (555) 349-8821',
  role: 'ORGANIZER',
  status: 'ACTIVE',
};

function ensureDefaultOrganizer() {
  const existing = db.prepare('SELECT id FROM organizers WHERE email = ?').get(DEFAULT_ORGANIZER.email);
  if (!existing) {
    db.prepare(`
      INSERT INTO organizers (id, name, email, password_hash, organization, phone, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      DEFAULT_ORGANIZER.id,
      DEFAULT_ORGANIZER.name,
      DEFAULT_ORGANIZER.email,
      hashPassword(DEFAULT_ORGANIZER.password),
      DEFAULT_ORGANIZER.organization,
      DEFAULT_ORGANIZER.phone,
      DEFAULT_ORGANIZER.role,
      DEFAULT_ORGANIZER.status
    );
    console.log(`[Seed] Seeded default verified organizer: ${DEFAULT_ORGANIZER.email} / ${DEFAULT_ORGANIZER.password}`);
  }
}

function seedDatabase(force = false) {
  ensureDefaultOrganizer();

  const existingCount = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
  if (existingCount > 0 && !force) {
    console.log('[Seed] Database already has events, skipping seed.');
    return;
  }

  if (force) {
    db.prepare('DELETE FROM check_in_logs').run();
    db.prepare('DELETE FROM email_outbox').run();
    db.prepare('DELETE FROM tickets').run();
    db.prepare('DELETE FROM ticket_tiers').run();
    db.prepare('DELETE FROM events').run();
    console.log('[Seed] Cleared existing data for fresh seed.');
  }

  console.log('[Seed] Seeding sample events, tiers, and attendees...');


  const events = [
    {
      id: 'evt_ai_summit_2026',
      slug: 'ai-summit-2026',
      title: 'Global AI & Web3 Summit 2026',
      description: 'The premier gathering of AI researchers, system architects, and Web3 innovators. Featuring 40+ keynotes, live technical workshops, and high-impact venture demos.',
      category: 'Technology Conference',
      start_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 4).toISOString(),
      location: 'San Francisco, CA',
      venue_name: 'Moscone West Convention Center',
      banner_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      capacity: 800,
      tiers: [
        {
          id: 'tier_ai_vip',
          name: 'VIP All-Access',
          price: 299,
          capacity: 150,
          perks: JSON.stringify(['Backstage VIP Lounge', 'Private Speaker Dinner', 'Priority Fast-Track Entrance', 'Full Session Recordings']),
        },
        {
          id: 'tier_ai_gen',
          name: 'General Admission',
          price: 99,
          capacity: 450,
          perks: JSON.stringify(['Access to all keynotes & tracks', 'Expo Floor & Demo Stations', 'Lunch & Networking Mixer']),
        },
        {
          id: 'tier_ai_stu',
          name: 'Student Builder Pass',
          price: 25,
          capacity: 200,
          perks: JSON.stringify(['Access to all sessions', 'Hackathon Participation', 'Career Fair Fast-Lane']),
        },
      ],
    },
    {
      id: 'evt_campus_hack_2026',
      slug: 'campus-hack-2026',
      title: 'Campus HackFest & Innovation Fest 2026',
      description: 'A 36-hour collegiate innovation sprint bringing together 600+ developers, designers, and creators to build the next generation of open-source tools.',
      category: 'Hackathon',
      start_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 8).toISOString(),
      location: 'Austin, TX',
      venue_name: 'Engineering Innovation Hall, UT Austin',
      banner_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
      capacity: 600,
      tiers: [
        {
          id: 'tier_hack_free',
          name: 'Hacker Admission (Free)',
          price: 0,
          capacity: 500,
          perks: JSON.stringify(['24/7 Hacker Access', 'Free Meals & RedBull', 'Swag Kit & Hardware Lab Access']),
        },
        {
          id: 'tier_hack_mentor',
          name: 'Mentor & Judge Pass',
          price: 0,
          capacity: 100,
          perks: JSON.stringify(['Mentor Lounge', 'Evaluation Voting Rights', 'Speaker Dinner']),
        },
      ],
    },
    {
      id: 'evt_devops_workshop',
      slug: 'cloud-native-deep-dive',
      title: 'Cloud Native & Kubernetes Hands-on Workshop',
      description: 'Intensive full-day masterclass on zero-downtime deployments, microservices observability, and eBPF security for modern backend infrastructure.',
      category: 'Workshop',
      start_date: new Date(Date.now() + 86400000 * 14).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 14 + 28800000).toISOString(),
      location: 'Seattle, WA',
      venue_name: 'TechHub Downtown Auditorium',
      banner_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      capacity: 150,
      tiers: [
        {
          id: 'tier_ws_std',
          name: 'Workshop Seat',
          price: 149,
          capacity: 150,
          perks: JSON.stringify(['Hands-on Lab Cloud Environment', 'Take-home Git Repos & Courseware', 'Certificate of Completion']),
        },
      ],
    },
    {
      id: 'evt_music_fest_2026',
      slug: 'neon-beats-festival-2026',
      title: 'Neon Beats Electronic Music Festival 2026',
      description: "Three stages, 20+ acts, and an immersive LED art installation experience. The west coast's premier electronic music celebration returns for its 5th year.",
      category: 'Music Festival',
      start_date: new Date(Date.now() + 86400000 * 21).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 23).toISOString(),
      location: 'Los Angeles, CA',
      venue_name: 'Exposition Park Open-Air Arena',
      banner_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
      capacity: 5000,
      tiers: [
        {
          id: 'tier_music_vip',
          name: 'VIP Backstage Pass',
          price: 399,
          capacity: 200,
          perks: JSON.stringify(['Artist Meet & Greet', 'Backstage Lounge Access', 'Complimentary Bar Wristband', 'Premium Merch Bundle']),
        },
        {
          id: 'tier_music_gen',
          name: 'General Admission (3-Day)',
          price: 179,
          capacity: 4000,
          perks: JSON.stringify(['All 3 Days Access', 'All 3 Stages', 'Art Installation Area']),
        },
        {
          id: 'tier_music_day',
          name: 'Single Day Pass',
          price: 79,
          capacity: 800,
          perks: JSON.stringify(['Day Pass for 1 Day Only', 'All Stages', 'Food & Drink Stalls']),
        },
      ],
    },
    {
      id: 'evt_product_summit',
      slug: 'product-design-summit-2026',
      title: 'Product & Design Leadership Summit 2026',
      description: 'A curated gathering of product leaders, UX directors, and design system architects sharing insights on shipping at scale, AI-integrated design workflows, and cross-functional team dynamics.',
      category: 'Summit',
      start_date: new Date(Date.now() + 86400000 * 30).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 31).toISOString(),
      location: 'New York, NY',
      venue_name: 'The Standard High Line Event Space',
      banner_url: 'https://images.unsplash.com/photo-1558008258-3256797b43f3?auto=format&fit=crop&w=1200&q=80',
      capacity: 300,
      tiers: [
        {
          id: 'tier_pd_exec',
          name: 'Executive Leadership Pass',
          price: 899,
          capacity: 50,
          perks: JSON.stringify(['C-Suite Roundtable', 'Private Workshops', 'Networking Dinner', 'Full Recordings Access']),
        },
        {
          id: 'tier_pd_pro',
          name: 'Professional Pass',
          price: 399,
          capacity: 200,
          perks: JSON.stringify(['All Keynotes & Breakouts', 'Lunch & Coffee Included', 'Digital Resources Vault']),
        },
        {
          id: 'tier_pd_virtual',
          name: 'Virtual Attendance',
          price: 99,
          capacity: 50,
          perks: JSON.stringify(['Live Stream All Sessions', 'On-demand Replay (30 days)', 'Community Slack Access']),
        },
      ],
    },
  ];

  const insertEvent = db.prepare(`
    INSERT INTO events (id, slug, title, description, category, start_date, end_date, location, venue_name, banner_url, capacity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTier = db.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, price, capacity, perks)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertTicket = db.prepare(`
    INSERT INTO tickets (id, ticket_code, event_id, tier_id, tier_name, attendee_name, attendee_email, attendee_phone, organization, status, signature_nonce, jwt_token, checked_in_at, checked_in_by, check_in_door, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLog = db.prepare(`
    INSERT INTO check_in_logs (id, ticket_id, ticket_code, event_id, attendee_name, tier_name, door_name, scanned_by, scan_result, scan_message, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ev of events) {
    insertEvent.run(
      ev.id,
      ev.slug,
      ev.title,
      ev.description,
      ev.category,
      ev.start_date,
      ev.end_date,
      ev.location,
      ev.venue_name,
      ev.banner_url,
      ev.capacity
    );

    for (const t of ev.tiers) {
      insertTier.run(t.id, ev.id, t.name, t.price, t.capacity, t.perks);
    }
  }

  // Pre-populate realistic attendees for Event 1 (AI Summit)
  const sampleAttendees = [
    { name: 'Dr. Elena Rostova', email: 'elena.rostova@deepmind-labs.org', org: 'Neural Labs', tier: 'VIP All-Access', tierId: 'tier_ai_vip', status: 'CHECKED_IN', door: 'Gate A - VIP Fastlane', by: 'Volunteer Sarah M.', code: 'EP-VIP-1001' },
    { name: 'Marcus Chen', email: 'marcus.chen@stanford.edu', org: 'Stanford AI Lab', tier: 'VIP All-Access', tierId: 'tier_ai_vip', status: 'CHECKED_IN', door: 'Gate A - VIP Fastlane', by: 'Volunteer Sarah M.', code: 'EP-VIP-1002' },
    { name: 'Priya Patel', email: 'priya.patel@synthcode.io', org: 'SynthCode Robotics', tier: 'General Admission', tierId: 'tier_ai_gen', status: 'CHECKED_IN', door: 'Gate B - North Turnstiles', by: 'Volunteer Alex K.', code: 'EP-GEN-2001' },
    { name: 'Lucas Dubois', email: 'lucas.d@polytech.fr', org: 'Paris Tech', tier: 'Student Builder Pass', tierId: 'tier_ai_stu', status: 'CHECKED_IN', door: 'Gate C - Student Hub', by: 'Volunteer Liam D.', code: 'EP-STU-3001' },
    { name: 'Aaliyah Washington', email: 'aaliyah.w@fintechgroup.com', org: 'Fintech Group', tier: 'General Admission', tierId: 'tier_ai_gen', status: 'VALID', door: null, by: null, code: 'EP-GEN-2002' },
    { name: 'Liam O’Connor', email: 'liam.oconnor@dublin-iot.ie', org: 'Dublin IoT', tier: 'VIP All-Access', tierId: 'tier_ai_vip', status: 'VALID', door: null, by: null, code: 'EP-VIP-2026' },
    { name: 'Sophia Kim', email: 'sophia.kim@kaist.ac.kr', org: 'KAIST Robotics', tier: 'Student Builder Pass', tierId: 'tier_ai_stu', status: 'VALID', door: null, by: null, code: 'EP-STU-3002' },
    { name: 'Carlos Mendez', email: 'carlos.m@devops-matrix.net', org: 'DevOps Matrix', tier: 'General Admission', tierId: 'tier_ai_gen', status: 'VALID', door: null, by: null, code: 'EP-GEN-2003' },
    { name: 'Amara Okafor', email: 'amara.okafor@lagostech.ng', org: 'Lagos Tech Hub', tier: 'General Admission', tierId: 'tier_ai_gen', status: 'VALID', door: null, by: null, code: 'EP-GEN-2004' },
    { name: 'Hiroshi Tanaka', email: 'tanaka.h@quantum-tokyo.co.jp', org: 'Quantum Systems', tier: 'VIP All-Access', tierId: 'tier_ai_vip', status: 'VALID', door: null, by: null, code: 'EP-VIP-1003' },
    { name: 'Devon Vance', email: 'devon.vance@spurious.io', org: 'Suspicious Corp', tier: 'General Admission', tierId: 'tier_ai_gen', status: 'REVOKED', door: null, by: null, code: 'EP-GEN-REVOKED' },
  ];

  sampleAttendees.forEach((att, idx) => {
    const ticketId = 'tkt_' + uuidv4().slice(0, 12);
    const nonce = generateNonce();
    const token = signTicketPayload({
      ticketId,
      ticketCode: att.code,
      eventId: 'evt_ai_summit_2026',
      attendeeName: att.name,
      attendeeEmail: att.email,
      tierName: att.tier,
      nonce,
    });

    const isCheckedIn = att.status === 'CHECKED_IN';
    const checkedInAt = isCheckedIn ? new Date(Date.now() - (30 - idx * 5) * 60000).toISOString() : null;

    insertTicket.run(
      ticketId,
      att.code,
      'evt_ai_summit_2026',
      att.tierId,
      att.tier,
      att.name,
      att.email,
      '+1-555-010' + idx,
      att.org,
      att.status,
      nonce,
      token,
      checkedInAt,
      att.by,
      att.door,
      new Date(Date.now() - 86400000 * 3).toISOString()
    );

    if (isCheckedIn) {
      insertLog.run(
        'log_' + uuidv4().slice(0, 8),
        ticketId,
        att.code,
        'evt_ai_summit_2026',
        att.name,
        att.tier,
        att.door,
        att.by,
        'SUCCESS',
        'Valid cryptographic pass verified at entrance',
        checkedInAt
      );
    }
  });

  // ── Hackathon Event attendees ─────────────────────────────────────────────
  const hackAttendees = [
    { name: 'Zoe Hernandez', email: 'zoe.h@mit.edu', org: 'MIT Media Lab', tier: 'Hacker Admission (Free)', tierId: 'tier_hack_free', status: 'VALID', code: 'EP-HAC-4001' },
    { name: 'Ravi Subramaniam', email: 'ravi.s@iit-bombay.in', org: 'IIT Bombay', tier: 'Hacker Admission (Free)', tierId: 'tier_hack_free', status: 'VALID', code: 'EP-HAC-4002' },
    { name: 'Claire Fontaine', email: 'claire.f@epitech.fr', org: 'Epitech Paris', tier: 'Hacker Admission (Free)', tierId: 'tier_hack_free', status: 'VALID', code: 'EP-HAC-4003' },
    { name: 'Dr. Kevin Marsh', email: 'kevin.marsh@tech-mentors.org', org: 'Tech Mentors Alliance', tier: 'Mentor & Judge Pass', tierId: 'tier_hack_mentor', status: 'VALID', code: 'EP-MNT-5001' },
    { name: 'Aisha Balogun', email: 'aisha.b@andela.com', org: 'Andela Engineering', tier: 'Mentor & Judge Pass', tierId: 'tier_hack_mentor', status: 'VALID', code: 'EP-MNT-5002' },
  ];

  hackAttendees.forEach((att, idx) => {
    const ticketId = 'tkt_' + uuidv4().slice(0, 12);
    const nonce = generateNonce();
    const token = signTicketPayload({
      ticketId, ticketCode: att.code, eventId: 'evt_campus_hack_2026',
      attendeeName: att.name, attendeeEmail: att.email, tierName: att.tier, nonce,
    });
    insertTicket.run(
      ticketId, att.code, 'evt_campus_hack_2026', att.tierId, att.tier,
      att.name, att.email, '+1-555-020' + idx, att.org,
      att.status, nonce, token, null, null, null,
      new Date(Date.now() - 86400000).toISOString()
    );
  });

  // ── Workshop Event attendees ───────────────────────────────────────────────
  const wsAttendees = [
    { name: 'Brian Kowalski', email: 'brian.k@cloudops-pro.com', org: 'CloudOps Pro', tier: 'Workshop Seat', tierId: 'tier_ws_std', status: 'VALID', code: 'EP-WRK-6001' },
    { name: 'Sandra Liu', email: 'sandra.l@msft-cloud.com', org: 'Microsoft Azure', tier: 'Workshop Seat', tierId: 'tier_ws_std', status: 'VALID', code: 'EP-WRK-6002' },
    { name: 'Jerome Baptiste', email: 'jerome.b@infra-labs.io', org: 'InfraLabs', tier: 'Workshop Seat', tierId: 'tier_ws_std', status: 'VALID', code: 'EP-WRK-6003' },
  ];

  wsAttendees.forEach((att, idx) => {
    const ticketId = 'tkt_' + uuidv4().slice(0, 12);
    const nonce = generateNonce();
    const token = signTicketPayload({
      ticketId, ticketCode: att.code, eventId: 'evt_devops_workshop',
      attendeeName: att.name, attendeeEmail: att.email, tierName: att.tier, nonce,
    });
    insertTicket.run(
      ticketId, att.code, 'evt_devops_workshop', att.tierId, att.tier,
      att.name, att.email, '+1-555-030' + idx, att.org,
      att.status, nonce, token, null, null, null,
      new Date(Date.now() - 43200000).toISOString()
    );
  });

  // ── Music Festival attendees ───────────────────────────────────────────────
  const musicAttendees = [
    { name: 'Maya Johansson', email: 'maya.j@djpro.se', org: 'DJ Collective Sweden', tier: 'VIP Backstage Pass', tierId: 'tier_music_vip', status: 'VALID', code: 'EP-VIP-7001' },
    { name: 'Tyler Brooks', email: 'tyler.b@soundcloud-prod.com', org: 'SoundCloud', tier: 'General Admission (3-Day)', tierId: 'tier_music_gen', status: 'VALID', code: 'EP-GEN-7002' },
    { name: 'Nour El-Masri', email: 'nour.m@beirut-beats.lb', org: 'Beirut Electronic Arts', tier: 'General Admission (3-Day)', tierId: 'tier_music_gen', status: 'VALID', code: 'EP-GEN-7003' },
    { name: 'Jackson Park', email: 'jackson.p@spotify-talent.com', org: 'Spotify Artist Team', tier: 'VIP Backstage Pass', tierId: 'tier_music_vip', status: 'VALID', code: 'EP-VIP-7004' },
    { name: 'Rosa Martinez', email: 'rosa.m@festlife.mx', org: 'Festival Life Magazine', tier: 'Single Day Pass', tierId: 'tier_music_day', status: 'VALID', code: 'EP-DAY-7005' },
  ];

  musicAttendees.forEach((att, idx) => {
    const ticketId = 'tkt_' + uuidv4().slice(0, 12);
    const nonce = generateNonce();
    const token = signTicketPayload({
      ticketId, ticketCode: att.code, eventId: 'evt_music_fest_2026',
      attendeeName: att.name, attendeeEmail: att.email, tierName: att.tier, nonce,
    });
    insertTicket.run(
      ticketId, att.code, 'evt_music_fest_2026', att.tierId, att.tier,
      att.name, att.email, '+1-555-040' + idx, att.org,
      att.status, nonce, token, null, null, null,
      new Date(Date.now() - 3600000 * (idx + 1)).toISOString()
    );
  });

  console.log('[Seed] Database successfully seeded with 5 events, ticket tiers, and verified attendees!');
}

module.exports = {
  seedDatabase,
};
