# 🎟️ EventPass — Cryptographic Event Ticketing & Real-Time QR Check-In System

An end-to-end event ticketing, anti-fraud cryptographic pass issuance, volunteer camera scanner, and real-time live attendance sync system designed for conferences, college fests, workshops, and meetups.

---

## 🚀 Key Features

### 1. 🛡️ Cryptographic Pass Issuance & Anti-Fraud Security
- **HMAC-SHA256 JWT Signing**: Every ticket generates a cryptographically signed payload containing `ticketId`, `ticketCode`, `eventId`, `attendeeName`, `attendeeEmail`, `tierName`, and a randomized `nonce`.
- **Anti-Counterfeit Protection**: The entrance scanner verifies digital signatures using backend cryptographic keys. Any tampered or corrupted QR codes are immediately flagged with a **TAMPERED / COUNTERFEIT** alert.
- **Anti-Replay & Duplicate Protection**: Once an attendee is admitted at any door/turnstile, their status is permanently marked as `CHECKED_IN` with timestamp, entrance door, and volunteer name. Subsequent scans trigger a **DUPLICATE ADMISSION** warning.
- **Instant Revocation**: Organizers can revoke fraudulent passes; revoking alters the ticket's nonce, immediately invalidating any printed or screenshot passes.

### 2. 📱 Doorbell Camera Scanner (Entrance Volunteers & Staff)
- **Camera QR Scanner**: Built using `html5-qrcode` with support for front/rear camera selection and camera switching.
- **Laser Viewfinder Reticle**: Sleek scanning animation with audio synthesis feedback via the **Web Audio API** (melodic 2-chord chime for valid passes, double-buzz warning for duplicates, low abrasive buzz for counterfeits).
- **Manual Code Lookup Fallback**: Allows volunteers to type or paste ticket codes (e.g. `EP-VIP-1001`) if attendee screens are cracked or in direct sunlight.
- **Instant Security Simulation Deck**: 1-click test buttons to verify all security scenarios (*Valid VIP Pass*, *Valid General Pass*, *Duplicate Scan*, *Tampered Signature*, *Revoked Pass*).

### 3. 📊 Real-Time Live Attendance Dashboard (Socket.io)
- **Live WebSocket Sync**: Admittance stats update the microsecond any volunteer scans an attendee at any entrance gate without page refreshes.
- **Real-Time KPIs**: Total Registered, Total Checked In, Percentage Gauge, Awaiting Arrival, and Check-In Velocity (scans / 15 minutes).
- **Gate Entrance Activity Stream**: Live feed displaying attendee names, tiers, entrance doors, and timestamps.
- **Attendee Roster Management**: Search by name, email, or code, filter by tier or status, manually admit or reset attendees, revoke passes, and export full roster to CSV.

### 4. 📬 Automated Email Delivery & Outbox Inspector
- **Nodemailer Integration**: Generates responsive HTML ticket emails featuring the event timetable, venue directions, and an **inline embedded CID QR code** (`cid:ticket_qr_code`).
- **Built-in Outbox Inspector**: Organizers can view all dispatched emails, inspect delivery status, and preview the rendered HTML pass directly in the application.

### 5. 🎫 Luxury Boarding Pass & Digital Wallet View
- Holographic foil sheen styling with perforated tear line and barcode styling.
- Live status pill (*VALID FOR ENTRY* in emerald, *CHECKED IN* in blue, *REVOKED* in crimson).
- 1-click **Add to Calendar** (.ics generator) for Apple Calendar, Google Calendar, and Outlook.
- Printable / Save PDF pass button.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Vanilla CSS Design System (Glassmorphism, Neon Accents, Responsive Grid), Lucide React, HTML5-QRCode, Canvas-Confetti, Socket.io-Client, Web Audio API.
- **Backend**: Node.js, Express 5, Socket.io, JSONWebToken (JWT), QRCode, Nodemailer, UUID, Better-SQLite3 (WAL mode).
- **Database**: SQLite with foreign keys, indexes, and automated migration & seed data.

---

## 📁 Project Structure

```
Event-pass/
├── client/                      # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Navigation, live socket status, reset demo
│   │   │   ├── EventCatalog.jsx        # Events hero, cards, ticket code lookup
│   │   │   ├── RegistrationModal.jsx   # Tier selection, checkout form
│   │   │   ├── TicketSuccessModal.jsx  # Confetti, QR display, quick links
│   │   │   ├── DigitalTicketPass.jsx   # Luxury holographic boarding pass
│   │   │   ├── EntranceScanner.jsx     # Html5Qrcode camera scanner & simulator
│   │   │   ├── LiveDashboard.jsx       # WebSocket live KPIs, velocity, roster
│   │   │   ├── CreateEventModal.jsx    # Organizer event creation
│   │   │   ├── EditEventModal.jsx      # Reschedule (postpone/prepone) & event details
│   │   │   ├── DeleteConfirmModal.jsx  # Safe cascading event deletion confirmation
│   │   │   └── EmailOutboxView.jsx     # Outbox inspector & HTML preview
│   │   ├── utils/
│   │   │   ├── audio.js                # Web Audio API sound synthesizer
│   │   │   └── calendar.js             # .ics iCalendar file generator
│   │   ├── index.css                   # Master design system & animations
│   │   ├── App.jsx                     # Core application orchestrator
│   │   └── main.jsx
│   ├── vite.config.js                  # Proxy configuration (/api & /socket.io)
│   └── package.json
│
├── server/                      # Node.js + Express Backend
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.js                # SQLite WAL connection & schema
│   │   │   └── seed.js                 # Sample events & verified attendees
│   │   ├── services/
│   │   │   ├── cryptoService.js        # HMAC-SHA256 JWT signing & verification
│   │   │   ├── qrService.js            # Base64 data URLs & CID PNG buffers
│   │   │   ├── emailService.js         # Nodemailer & HTML email templates
│   │   │   └── statsService.js         # Real-time event analytics calculation
│   │   ├── routes/
│   │   │   ├── events.js               # Event CRUD & seed management
│   │   │   ├── tickets.js              # Registration, code lookup, roster
│   │   │   ├── scan.js                 # Scanner verification & duplicate guard
│   │   │   ├── stats.js                # Real-time dashboard stats
│   │   │   └── outbox.js               # Dispatched email inspection
│   │   └── index.js                    # Express + Socket.io server
│   └── package.json
│
└── package.json                 # Root unified dev & build scripts
```

---

## 🏃 Getting Started

### 1. Start Both Backend & Frontend Concurrently:
```bash
npm run dev
```

Or run them individually in separate terminals:

**Backend Server** (Port `5000`):
```bash
npm run server
```

**Frontend Client** (Port `5173`):
```bash
npm run client
```

Then visit **http://localhost:5173** in your web browser.

---

## 🧪 Testing the Anti-Fraud System

1. **Register Attendee**:
   - Go to **Events & Pass** tab, click **Register Pass** on *Global AI & Web3 Summit 2026*.
   - Fill in attendee details and submit.
   - Watch the confetti explosion and view your generated cryptographic pass!

2. **Scan Pass at Door**:
   - Click **Test Entrance Scan** or switch to the **Doorbell Scanner** tab.
   - Click **Start Entrance Camera** (or test with your webcam/phone camera).
   - Alternatively, click the quick test buttons on the right:
     - 🟢 **Valid VIP Pass** -> Graces green overlay + cheerful chime!
     - 🟡 **Duplicate Pass** -> Flags amber alert with previous scan time and volunteer name!
     - 🔴 **Tampered Signature** -> Triggers red fraud alert and counterfeit buzzer!

3. **Check Live Dashboard**:
   - Switch to **Live Dashboard** tab to watch stats, entrance throughput, and the live gate stream update in real time.

---

## 🚢 Production Deployment

EventPass is engineered for **1-click single-service full-stack deployment** (or separate frontend/backend hosting).

### Option A: Render.com (Recommended Free Hosting)
1. Push this project to your GitHub repository.
2. In Render, select **New +** -> **Blueprint** and connect your repository.
3. Render reads `render.yaml` automatically and configures:
   - **Build Command**: `npm run postinstall && npm run build`
   - **Start Command**: `npm start`
   - **Persistent Disk**: Mounted to keep your SQLite database across restarts.

### Option B: Railway.app
1. Push this repository to GitHub.
2. In Railway, click **New Project** -> **Deploy from GitHub repo**.
3. Railway automatically detects `npm run build` and `npm start`.
4. (Optional) Add a persistent volume for `./server/data`.

### Option C: Docker Container
Build and launch the production container with health checks:
```bash
docker build -t eventpass .
docker run -p 5000:5000 -v eventpass_data:/app/server/data eventpass
```

### Environment Variables
Configure these in your production host environment dashboard:
| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Production mode | `production` |
| `PORT` | Web server listening port | `5000` (or host assigned) |
| `JWT_SECRET` | Secret key for cryptographic ticket signatures | *Generate random hex* |
| `ORGANIZER_KEY` | Passkey for master admin access | `eventpass2026` |
| `DB_PATH` | Path to SQLite database file | `./server/data/eventpass.db` |
| `SMTP_HOST` | Custom SMTP server (e.g. SendGrid, Gmail) | Optional (defaults to Ethereal mock) |
| `SMTP_USER` | SMTP username | Optional |
| `SMTP_PASS` | SMTP password / app password | Optional |
| `RAZORPAY_KEY_ID` | Live Razorpay Key ID | Optional (defaults to in-app Sandbox) |
| `RAZORPAY_KEY_SECRET` | Live Razorpay Key Secret | Optional |


