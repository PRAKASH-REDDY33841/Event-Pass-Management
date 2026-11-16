const db = require('./index');

// 1. Update Known More about Tech to Bengaluru, India
db.prepare(`
  UPDATE events 
  SET country = 'India', city = 'Bengaluru', location = 'Bengaluru, Karnataka, India', 
      venue_name = 'BIEC Convention Centre, Bengaluru', latitude = 13.0617, longitude = 77.4764, currency = 'INR'
  WHERE id = 'evt_374109ab-b'
`).run();

// 2. Update US events with US country & coordinates & USD
const usUpdates = [
  { id: 'evt_ai_summit_2026', city: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { id: 'evt_campus_hack_2026', city: 'Austin', lat: 30.2672, lng: -97.7431 },
  { id: 'evt_devops_workshop', city: 'Seattle', lat: 47.6062, lng: -122.3321 },
  { id: 'evt_music_fest_2026', city: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { id: 'evt_product_summit', city: 'New York', lat: 40.7128, lng: -74.0060 },
  { id: 'evt_aa71a7a4-8', city: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { id: 'evt_418ece6e-a', city: 'Austin', lat: 30.2672, lng: -97.7431 },
];

for (const u of usUpdates) {
  db.prepare(`UPDATE events SET country = 'United States', city = ?, latitude = ?, longitude = ?, currency = 'USD' WHERE id = ?`).run(u.city, u.lat, u.lng, u.id);
}

// 3. Add prominent Indian events if not already present
const indianEvents = [
  {
    id: 'evt_blr_deeptech_2026',
    slug: 'bengaluru-ai-deeptech-2026',
    title: 'Bengaluru AI & DeepTech Summit 2026',
    description: "India's flagship gathering of AI researchers, founders, and engineers showcasing generative AI breakthroughs and scalable systems architecture.",
    category: 'Conference',
    start_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    end_date: new Date(Date.now() + 86400000 * 4).toISOString(),
    location: 'Bengaluru, Karnataka, India',
    venue_name: 'Nimhans Convention Centre, Bengaluru',
    banner_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    capacity: 600,
    currency: 'INR',
    country: 'India',
    city: 'Bengaluru',
    latitude: 12.9344,
    longitude: 77.5956,
    tiers: [
      { id: 'tier_blr_vip', name: 'VIP All-Access', price: 2999, capacity: 100, perks: JSON.stringify(['VIP Lounge Access', 'Founder Dinner', 'Fast-Track Entrance']) },
      { id: 'tier_blr_gen', name: 'General Admission', price: 999, capacity: 350, perks: JSON.stringify(['Keynote Sessions', 'Expo Floor Access', 'Networking Lunch']) },
      { id: 'tier_blr_stu', name: 'Student Pass', price: 299, capacity: 150, perks: JSON.stringify(['Student ID Verification at Door', 'Workshop Entry']) }
    ]
  },
  {
    id: 'evt_hyd_web3_2026',
    slug: 'hyderabad-cloud-web3-2026',
    title: 'Hyderabad Cloud Native & Web3 Conclave',
    description: 'Join 500+ cloud architects, DevOps engineers, and distributed systems builders for deep technical workshops and hackathons in Cyberabad.',
    category: 'Workshop',
    start_date: new Date(Date.now() + 86400000 * 6).toISOString(),
    end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
    location: 'Hyderabad, Telangana, India',
    venue_name: 'HITEX Exhibition Centre, Hitec City',
    banner_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    capacity: 500,
    currency: 'INR',
    country: 'India',
    city: 'Hyderabad',
    latitude: 17.4716,
    longitude: 78.3728,
    tiers: [
      { id: 'tier_hyd_vip', name: 'Executive Pass', price: 1999, capacity: 100, perks: JSON.stringify(['Private Lounge', 'Priority Seating']) },
      { id: 'tier_hyd_gen', name: 'Standard Seat', price: 499, capacity: 300, perks: JSON.stringify(['Hands-on Lab Cloud Environment', 'Git Repos']) },
      { id: 'tier_hyd_free', name: 'Student Hacker (Free)', price: 0, capacity: 100, perks: JSON.stringify(['Hackathon Track', 'Mentor Access']) }
    ]
  },
  {
    id: 'evt_mum_hack_2026',
    slug: 'campus-hackfest-india-2026',
    title: 'Campus HackFest India 2026',
    description: '36-hour non-stop collegiate innovation hackathon bringing students across India together to build AI agents and decentralized protocols.',
    category: 'Hackathon',
    start_date: new Date(Date.now() + 86400000 * 10).toISOString(),
    end_date: new Date(Date.now() + 86400000 * 12).toISOString(),
    location: 'Mumbai, Maharashtra, India',
    venue_name: 'IIT Bombay Innovation Hub, Powai',
    banner_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80',
    capacity: 700,
    currency: 'INR',
    country: 'India',
    city: 'Mumbai',
    latitude: 19.1334,
    longitude: 72.9133,
    tiers: [
      { id: 'tier_mum_free', name: 'Hacker Pass (Free)', price: 0, capacity: 550, perks: JSON.stringify(['24/7 Hacker Hall Access', 'Free Meals & Swag', 'API Credits']) },
      { id: 'tier_mum_pro', name: 'Professional Sponsor / Mentor', price: 1499, capacity: 150, perks: JSON.stringify(['Talent Pool Access', 'Judging Panel']) }
    ]
  }
];

for (const ev of indianEvents) {
  const exists = db.prepare('SELECT id FROM events WHERE id = ?').get(ev.id);
  if (!exists) {
    db.prepare(`
      INSERT INTO events (id, slug, title, description, category, start_date, end_date, location, venue_name, banner_url, capacity, currency, country, city, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ev.id, ev.slug, ev.title, ev.description, ev.category, ev.start_date, ev.end_date, ev.location, ev.venue_name, ev.banner_url, ev.capacity, ev.currency, ev.country, ev.city, ev.latitude, ev.longitude);
    for (const t of ev.tiers) {
      db.prepare(`
        INSERT INTO ticket_tiers (id, event_id, name, price, capacity, perks)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(t.id, ev.id, t.name, t.price, t.capacity, t.perks);
    }
  }
}

console.log('Successfully migrated events with Indian locations, coordinates, and INR currency.');

