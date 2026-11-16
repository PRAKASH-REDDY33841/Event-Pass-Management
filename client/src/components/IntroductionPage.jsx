import React from 'react';
import { 
  ShieldCheck, QrCode, LayoutDashboard, Calendar, 
  Sparkles, AlertTriangle, ArrowRight, Smartphone, Volume2, 
  Activity, Users
} from 'lucide-react';

export default function IntroductionPage({ onNavigate, onOpenCreateEvent, isOrganizer }) {
  return (
    <div className="page-container">
      
      {/* 1. HERO SECTION */}
      <section className="hero-card-responsive">
        <div className="grid-2col-responsive">
          {/* Hero Left: Copy & CTAs */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              marginBottom: '16px',
            }}>
              <Sparkles size={14} color="#0f172a" />
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.04em' }}>
                ENTERPRISE EVENT TICKETING & ADMISSIONS
              </span>
            </div>

            <h1 style={{
              fontSize: '40px',
              fontWeight: '900',
              lineHeight: '1.15',
              marginBottom: '18px',
              color: '#0f172a',
              letterSpacing: '-0.03em',
            }}>
              EventPass — Cryptographic Ticketing & Real-Time QR Check-In
            </h1>

            <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#475569', marginBottom: '28px' }}>
              An enterprise-grade, anti-fraud event platform engineered to eliminate counterfeit ticket scalping, block replay screenshot admissions at gate turnstiles, and deliver instantaneous entrance telemetry over live WebSockets.
            </p>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '32px' }}>
              <button
                className="btn-primary"
                onClick={() => onNavigate('events')}
                style={{ padding: '11px 20px', fontSize: '14px' }}
              >
                Browse Events & Issue Pass
                <ArrowRight size={15} />
              </button>

              <button
                className="btn-secondary"
                onClick={() => onNavigate('scanner')}
                style={{ padding: '11px 18px', fontSize: '14px' }}
              >
                <Smartphone size={15} color="#0f172a" />
                Launch Scanner
              </button>

              <button
                className="btn-secondary"
                onClick={() => onNavigate('dashboard')}
                style={{ padding: '11px 18px', fontSize: '14px' }}
              >
                <Activity size={15} color="#0f172a" />
                Live Attendance Sync
              </button>
            </div>

            {/* Hero Quick Metrics */}
            <div className="grid-3col-responsive" style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '20px',
            }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>HMAC-256</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Cryptographic JWT Signing</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>&lt; 50ms</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Real-Time Socket.io Sync</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>100%</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Anti-Replay Gate Lockout</div>
              </div>
            </div>
          </div>

          {/* Hero Right: High-Impact Visual */}
          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.12)',
              border: '1px solid #e2e8f0',
              position: 'relative',
              background: '#f8fafc',
            }}>
              <img
                src="/images/hero-pass.jpg"
                alt="Cryptographic Holographic Ticket Pass"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  transform: 'scale(1.01)',
                  transition: 'transform 0.4s ease',
                }}
              />

              {/* Floating Status Glass Badge */}
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                right: '12px',
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(12px)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <ShieldCheck size={16} color="#15803d" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>DIGITAL SIGNATURE VALID</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>EP-VIP-1001 • Single-Use Cryptographic Nonce</div>
                  </div>
                </div>
                <span className="badge-vip" style={{ fontSize: '9.5px' }}>SECURE VIP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE PROBLEM VS THE SOLUTION */}
      <section style={{ marginBottom: '60px' }}>
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 36px' }}>
          <span className="badge-gen" style={{ fontSize: '11px', marginBottom: '8px' }}>SECURITY COMPARISON</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
            Why Modern Events Need Cryptographic Verification
          </h2>
          <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: '1.6' }}>
            Traditional ticketing systems rely on static barcodes and unencrypted text URLs that are easily forged, shared via screenshots, or used at multiple gates simultaneously.
          </p>
        </div>

        <div className="grid-cards-auto">
          {/* Problem Card */}
          <div className="glass-panel" style={{
            padding: '28px 24px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #fee2e2',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)',
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <AlertTriangle size={22} color="#b91c1c" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#991b1b', marginBottom: '14px' }}>
              The Traditional Ticketing Crisis
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px', color: '#334155' }}>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: '#ef4444', fontWeight: '700' }}>✕</span>
                <span><strong>Screenshot Duplication:</strong> Attendees screenshot their ticket and send it to friends entering through different doors simultaneously.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: '#ef4444', fontWeight: '700' }}>✕</span>
                <span><strong>Counterfeit Scalping:</strong> Fraudulent QR generators replicate ticket IDs without any verifiable mathematical signature.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: '#ef4444', fontWeight: '700' }}>✕</span>
                <span><strong>Hardware Scanner Glitches:</strong> Dedicated laser guns fail under sunlight glare and cracked screens, creating massive gate bottlenecks.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: '#ef4444', fontWeight: '700' }}>✕</span>
                <span><strong>Blind Operations:</strong> Event organizers have zero live insight into attendance velocity or crowd distribution across gates.</span>
              </li>
            </ul>
          </div>

          {/* Solution Card */}
          <div className="glass-panel" style={{
            padding: '28px 24px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #bbf7d0',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)',
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <ShieldCheck size={22} color="#15803d" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#166534', marginBottom: '14px' }}>
              The EventPass Security Architecture
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px', color: '#334155' }}>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: '#16a34a', fontWeight: '700' }}>✓</span>
                <span><strong>Cryptographic JWT Signing:</strong> Every pass carries an HMAC-SHA256 digital signature and randomized nonce verified at the entrance.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: '#16a34a', fontWeight: '700' }}>✓</span>
                <span><strong>Anti-Replay Gate Lockout:</strong> The instant a pass is admitted at any gate, it is locked in the database with timestamp, gate name, and volunteer ID.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: '#16a34a', fontWeight: '700' }}>✓</span>
                <span><strong>Universal Doorbell Camera Scanner:</strong> Any phone or laptop camera works instantly, backed by synthesized Web Audio chimes and manual fallback.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: '#16a34a', fontWeight: '700' }}>✓</span>
                <span><strong>Live WebSocket Dashboard:</strong> Turnout telemetry, entrance velocity (scans/15m), and gate stream update in under 50ms without page reloads.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. THREE CORE PILLARS */}
      <section style={{ marginBottom: '60px' }}>
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 40px' }}>
          <span className="badge-gen" style={{ fontSize: '11px', marginBottom: '8px' }}>SYSTEM DEEP-DIVE</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
            Comprehensive End-to-End Capabilities
          </h2>
          <p style={{ fontSize: '14.5px', color: '#475569', lineHeight: '1.6' }}>
            From ticket issuance and email delivery to entrance scanning and live analytics.
          </p>
        </div>

        {/* Feature 1: Doorbell Camera Scanner */}
        <div className="glass-panel" style={{
          borderRadius: '24px',
          overflow: 'hidden',
          marginBottom: '32px',
          padding: '24px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
        }}>
          <div className="grid-2col-responsive">
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <img
                src="/images/camera-scanner.jpg"
                alt="Doorbell Camera Scanner in Action"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#0f172a', fontSize: '11.5px', fontWeight: '700', marginBottom: '12px' }}>
                <QrCode size={14} /> DOORBELL CAMERA SCANNER
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', lineHeight: '1.25' }}>
                High-Speed Volunteer Scanner with Acoustic Synthesis
              </h3>
              <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: '#475569', marginBottom: '18px' }}>
                Volunteers don't need dedicated barcode hardware. The built-in scanner runs in any standard web browser using the device camera with front/rear switching and automatic reticle alignment.
              </p>

              <div className="grid-form-2col" style={{ marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                    <Volume2 size={16} /> Web Audio Chime
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Pleasant double-chime for valid pass; alert buzz for counterfeits.</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                    <AlertTriangle size={16} /> Replay Alert
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Shows exact previous scan time, door name, and staff member who scanned.</div>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => onNavigate('scanner')}
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Test Scanner & Simulation Deck
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Feature 2: Real-Time Live Attendance Operations */}
        <div className="glass-panel" style={{
          borderRadius: '24px',
          overflow: 'hidden',
          marginBottom: '32px',
          padding: '24px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
        }}>
          <div className="grid-2col-responsive">
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <img
                src="/images/command-center.jpg"
                alt="Command Center Analytics Dashboard"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#0f172a', fontSize: '11.5px', fontWeight: '700', marginBottom: '12px' }}>
                <LayoutDashboard size={14} /> LIVE WEBSOCKET COMMAND CENTER
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', lineHeight: '1.25' }}>
                Sub-Second Attendance Telemetry & Roster Control
              </h3>
              <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: '#475569', marginBottom: '18px' }}>
                Organizers track live admittance without ever refreshing the page. The instant an attendee steps through Gate A, the live count increments, velocity recalculates, and gate stream flashes green.
              </p>

              <div className="grid-form-2col" style={{ marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                    <Activity size={16} /> Velocity Analytics
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Calculates entrance flow rate (scans per 15 minutes) to detect queue buildups.</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                    <Users size={16} /> Roster Search & CSV
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Instant name/code lookup, manual admission override, and 1-click CSV export.</div>
                </div>
              </div>

              <button
                className="btn-secondary"
                onClick={() => onNavigate('dashboard')}
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Open Live Dashboard
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Feature 3: Event Lifecycle & Scheduling */}
        <div className="glass-panel" style={{
          borderRadius: '24px',
          padding: '28px 24px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
        }}>
          <div className="grid-2col-responsive">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#0f172a', fontSize: '11.5px', fontWeight: '700', marginBottom: '12px' }}>
                <Calendar size={14} /> EVENT LIFECYCLE MANAGEMENT
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                Seamless Rescheduling: Postpone, Prepone, or Delete
              </h3>
              <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: '#475569', marginBottom: '18px' }}>
                Need to postpone an event by a day, prepone it by a week, or adjust venue details? EventPass handles dynamic date shifts with automatic preservation of attendee digital ticket passes and cryptographic integrity.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '22px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '5px 10px', borderRadius: '6px', background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0' }}>
                  ⏩ Postpone +1d / +1w
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '5px 10px', borderRadius: '6px', background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0' }}>
                  ⏪ Prepone -1d / -1w
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '5px 10px', borderRadius: '6px', background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0' }}>
                  🔄 Real-Time Socket Sync
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '5px 10px', borderRadius: '6px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                  🗑️ Cascading Safe Delete
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={() => onNavigate('events')}
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  {isOrganizer ? 'Manage Events Catalog' : 'Explore Upcoming Events'}
                  <ArrowRight size={14} />
                </button>
                {isOrganizer && onOpenCreateEvent && (
                  <button
                    className="btn-secondary"
                    onClick={onOpenCreateEvent}
                    style={{ padding: '10px 18px', fontSize: '13px' }}
                  >
                    + Create New Event
                  </button>
                )}
              </div>
            </div>

            {/* Architecture Box */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Full-Stack Architecture Stack
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: '600' }}>Frontend Framework</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>React 19 + Vite</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: '600' }}>Real-Time Protocol</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>Socket.io (WebSockets)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: '600' }}>Security Engine</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>HMAC-SHA256 JWT Nonce</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: '600' }}>Camera Scanning</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>HTML5-QRCode + Audio API</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: '600' }}>Database Engine</span>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>SQLite (WAL Mode + Cascade)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS 4-STEP TIMELINE */}
      <section style={{ marginBottom: '60px' }}>
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 36px' }}>
          <span className="badge-gen" style={{ fontSize: '11px', marginBottom: '8px' }}>HOW IT WORKS</span>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
            The 4-Step Lifecycle of an EventPass
          </h2>
          <p style={{ fontSize: '14.5px', color: '#475569' }}>
            From organizer publication to entrance verification and audit trail.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
          gap: '16px',
        }}>
          {/* Step 1 */}
          <div className="glass-panel" style={{ padding: '22px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>01</div>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Create Event & Tiers
            </h4>
            <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#475569' }}>
              Define pricing, custom capacities, venue dates, and perks. Reschedule or postpone anytime with immediate database propagation.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-panel" style={{ padding: '22px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>02</div>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Issue Cryptographic Pass
            </h4>
            <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#475569' }}>
              Attendee registers. Backend creates an HMAC-SHA256 JWT with unique nonce, renders holographic pass, and delivers HTML email with inline QR.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-panel" style={{ padding: '22px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>03</div>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Scan at Door Turnstile
            </h4>
            <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#475569' }}>
              Volunteer points phone camera at QR code. Signature is verified in milliseconds. Valid pass chimes green; duplicates sound amber warning.
            </p>
          </div>

          {/* Step 4 */}
          <div className="glass-panel" style={{ padding: '22px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>04</div>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Live Telemetry & Sync
            </h4>
            <p style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#475569' }}>
              WebSockets transmit attendance metrics instantly to organizer dashboard. Monitor venue capacity, gate throughput, and export audit roster.
            </p>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM INTERACTIVE LAUNCHPAD */}
      <section style={{
        textAlign: 'center',
        padding: '36px 20px',
        borderRadius: '20px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
      }}>
        <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
          Ready to Test the Security Engine?
        </h3>
        <p style={{ fontSize: '14.5px', color: '#475569', maxWidth: '580px', margin: '0 auto 24px', lineHeight: '1.6' }}>
          Explore existing demo events, issue a digital boarding pass, or test fraudulent QR scan scenarios right in the entrance simulator.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={() => onNavigate('events')}
            style={{ padding: '11px 22px', fontSize: '13.5px' }}
          >
            Go to Events & Pass
            <ArrowRight size={15} />
          </button>

          <button
            className="btn-secondary"
            onClick={() => onNavigate('scanner')}
            style={{ padding: '11px 18px', fontSize: '13.5px' }}
          >
            Open Doorbell Camera Scanner
          </button>

          <button
            className="btn-secondary"
            onClick={() => onNavigate('dashboard')}
            style={{ padding: '11px 18px', fontSize: '13.5px' }}
          >
            Launch Live Dashboard
          </button>
        </div>
      </section>

    </div>
  );
}
