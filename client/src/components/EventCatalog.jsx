import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, Users, ArrowRight, ShieldCheck, Zap, Sparkles, 
  Search, Trash2, Clock, Plus, CheckCircle2, Ticket, XCircle, 
  Compass, Globe, Navigation 
} from 'lucide-react';
import TicketCancellationModal from './TicketCancellationModal';
import { formatCurrency, formatPriceRange } from '../utils/currency';
import { calculateDistance, formatDistance } from '../utils/geolocation';

export default function EventCatalog({ 
  events, 
  onSelectEvent, 
  onRegister, 
  onLookupCode, 
  onOpenDashboard, 
  onEditEvent, 
  onDeleteEvent, 
  onOpenCreateEvent, 
  isOrganizer, 
  currency = 'INR',
  userLocation,
  onRequestLocationPermission,
  attendeeUser,
  myRegistrations = [],
  onOpenAttendeeLogin,
  onAttendeeLogout,
  onRefreshRegistrations,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [ticketCodeInput, setTicketCodeInput] = useState('');
  const [pricingFilter, setPricingFilter] = useState('all'); // 'all' | 'free' | 'paid' | 'registered'
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' (default) | 'past' | 'all'
  const [radiusFilter, setRadiusFilter] = useState('country'); // 'country' (All India default) | 'city' | 'global'
  const [cancellationTarget, setCancellationTarget] = useState(null); // { ticket, event }

  // Map registrations strictly for the current attendee user (O(1) lookup)
  const registeredByEventId = {};
  myRegistrations.forEach(r => {
    if (r.eventId) registeredByEventId[r.eventId] = r;
  });

  const now = new Date();
  const isPastEvent = (e) => new Date(e.end_date) < now;

  const activeEventsCount = events.filter(e => !isPastEvent(e)).length;
  const pastEventsCount = events.filter(e => isPastEvent(e)).length;

  const currentPool = events.filter(e => {
    if (statusFilter === 'active') return !isPastEvent(e);
    if (statusFilter === 'past') return isPastEvent(e);
    return true;
  });

  const freeEventsCount = currentPool.filter(e => e.min_tier_price === 0 || e.free_tier_count > 0 || e.max_tier_price === 0).length;
  const paidEventsCount = currentPool.filter(e => e.paid_tier_count > 0 || e.max_tier_price > 0).length;

  const userCountry = (userLocation?.country || 'India').toLowerCase();
  const userLat = userLocation?.lat ?? 12.9716;
  const userLng = userLocation?.lng ?? 77.5946;

  const filteredEvents = events.filter(e => {
    // 1. Status Filter (For attendees, concluded/past events are excluded so only active upcoming events display)
    const isPast = isPastEvent(e);
    if (!isOrganizer && isPast) return false;
    if (statusFilter === 'active' && isPast) return false;
    if (statusFilter === 'past' && !isPast) return false;

    // 2. Search query filter
    const matchesSearch = 
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.location && e.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.city && e.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.country && e.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.category && e.category.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;

    // 3. Pricing Filter
    if (pricingFilter === 'free') {
      if (!(e.min_tier_price === 0 || e.free_tier_count > 0 || e.max_tier_price === 0)) return false;
    }
    if (pricingFilter === 'paid') {
      if (!(e.paid_tier_count > 0 || e.max_tier_price > 0)) return false;
    }
    if (pricingFilter === 'registered') {
      if (!registeredByEventId[e.id]) return false;
    }

    // 4. Geolocation & Distance / Radius Filter
    // Calculate distance to attendee coordinates
    const distKm = (e.latitude != null && e.longitude != null)
      ? calculateDistance(userLat, userLng, e.latitude, e.longitude)
      : null;
    e._distanceKm = distKm;

    const eventCountry = (e.country || '').toLowerCase();

    if (radiusFilter === 'city') {
      const userCity = (userLocation?.city || 'bengaluru').toLowerCase();
      const eventCity = (e.city || '').toLowerCase();
      if (!eventCity.includes(userCity)) {
        return false;
      }
    } else if (radiusFilter === 'country') {
      // Default: Only show events occurring in user's country (India). Hides foreign events
      if (eventCountry && eventCountry !== userCountry) {
        return false;
      }
    } else if (radiusFilter === 'global') {
      // Show all events worldwide (Indian + International)
      return true;
    }

    return true;
  });

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (!ticketCodeInput.trim()) return;
    onLookupCode(ticketCodeInput.trim());
  };

  return (
    <div className="page-container">
      {/* Hero Section */}
      <div className="hero-card-responsive">
        <div style={{ maxWidth: '780px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', background: '#f1f5f9', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
            <Sparkles size={14} color="#0f172a" />
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', letterSpacing: '0.04em' }}>
              NEXT-GEN EVENT TICKETING & VERIFICATION
            </span>
          </div>

          <h1 style={{ fontSize: '40px', fontWeight: '900', lineHeight: '1.15', marginBottom: '16px', color: '#0f172a', letterSpacing: '-0.025em' }}>
            Fraud-Proof Event Passes & Real-Time Entrance Check-In
          </h1>

          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#475569', marginBottom: '28px' }}>
            Issue cryptographically signed QR tickets with automated email delivery, prevent duplicate admissions at the door with camera scanner verification, and monitor venue entry live via WebSockets.
          </p>

          {/* Quick Ticket Lookup Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            background: '#f8fafc',
            padding: '8px',
            borderRadius: '14px',
            border: '1px solid #cbd5e1',
            maxWidth: '560px',
          }}>
            <input
              type="text"
              placeholder="Already have a pass? Enter Ticket Code (e.g. EP-VIP-1001)"
              value={ticketCodeInput}
              onChange={(e) => setTicketCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookupSubmit(e)}
              style={{
                flex: 1,
                minWidth: '240px',
                background: 'transparent',
                border: 'none',
                color: '#0f172a',
                padding: '10px 14px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              className="btn-primary"
              onClick={handleLookupSubmit}
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              <Search size={14} />
              View Pass
            </button>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '36px',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#0f172a" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Cryptographic Signing</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>HMAC-SHA256 JWT QR Pass</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} color="#0f172a" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Doorbell Camera Scanner</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Instant audio & fraud alert</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="#0f172a" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Live Attendance Sync</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Real-time Socket.io stats</div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendee Identity Context Banner */}
      {attendeeUser ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '12px',
            }}>
              ✓
            </div>
            <div>
              <span style={{ fontSize: '13px', color: '#166534' }}>
                Showing personalized passes for: <strong style={{ color: '#0f172a' }}>{attendeeUser.name || attendeeUser.email}</strong>
              </span>
              <span style={{ fontSize: '12px', color: '#475569', marginLeft: '6px' }}>
                ({myRegistrations.length} active registered event{myRegistrations.length !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {myRegistrations.length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPricingFilter(pricingFilter === 'registered' ? 'all' : 'registered')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: pricingFilter === 'registered' ? '#0f172a' : '#ffffff',
                  borderColor: pricingFilter === 'registered' ? '#0f172a' : '#cbd5e1',
                  color: pricingFilter === 'registered' ? '#ffffff' : '#0f172a',
                }}
              >
                <Ticket size={13} />
                {pricingFilter === 'registered' ? 'Show All Events' : `Show My Registered Events (${myRegistrations.length})`}
              </button>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={onOpenAttendeeLogin}
              style={{ padding: '6px 12px', fontSize: '12px', color: '#475569' }}
              title="Sign in with a different email or sign out to guest"
            >
              Switch Attendee / Not You?
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={16} color="#0f172a" />
            <span style={{ fontSize: '13px', color: '#334155' }}>
              Browsing public catalog as <strong>Guest</strong>. Sign in with your email to view your personal passes and confirmed seats.
            </span>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={onOpenAttendeeLogin}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
            }}
          >
            Sign In with Email
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Events Header & Search */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
            Upcoming Featured Events
          </h2>
          <p style={{ fontSize: '14px', color: '#475569' }}>
            Select an event to register or jump directly into the live entrance scanner.
          </p>
        </div>

        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search events, cities, topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Geolocation & Radius Filter Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '14px 20px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#0f172a',
            fontSize: '13px',
            fontWeight: '700',
          }}>
            <MapPin size={17} color="#0f172a" />
            <span>Attendee Location: <strong style={{ color: '#0f172a' }}>{userLocation?.city || 'Bengaluru'}, {userLocation?.country || 'India'}</strong></span>
          </div>

          <button
            type="button"
            onClick={onRequestLocationPermission}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
            title="Request browser GPS location to calculate exact road distance"
          >
            <Compass size={13} />
            <span>Use Exact GPS Location</span>
          </button>
        </div>

        {/* Location & Region Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginRight: '2px' }}>
            Region:
          </span>

          <button
            type="button"
            onClick={() => setRadiusFilter('city')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: '800',
              border: radiusFilter === 'city' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: radiusFilter === 'city' ? '#0f172a' : '#ffffff',
              color: radiusFilter === 'city' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={`Show events happening in ${userLocation?.city || 'Bengaluru'}`}
          >
            📍 {userLocation?.city || 'Bengaluru'} (Local)
          </button>

          <button
            type="button"
            onClick={() => setRadiusFilter('country')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: '800',
              border: radiusFilter === 'country' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: radiusFilter === 'country' ? '#0f172a' : '#ffffff',
              color: radiusFilter === 'country' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Show events happening in India (Default)"
          >
            🇮🇳 All India (Default)
          </button>

          <button
            type="button"
            onClick={() => setRadiusFilter('global')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: '800',
              border: radiusFilter === 'global' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: radiusFilter === 'global' ? '#0f172a' : '#ffffff',
              color: radiusFilter === 'global' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Show international events worldwide (India + Global)"
          >
            🌍 Global (All Countries)
          </button>
        </div>
      </div>

      {/* Student Filter Bar: Active vs Past & Free vs Paid Events */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        padding: '14px 20px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          {/* Active Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '9999px', padding: '3px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '800',
                border: 'none',
                background: statusFilter === 'active' ? '#0f172a' : 'transparent',
                color: statusFilter === 'active' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🟢 Active Events</span>
              <span style={{
                background: statusFilter === 'active' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: statusFilter === 'active' ? '#ffffff' : '#475569',
                padding: '1px 6px',
                borderRadius: '9999px',
                fontSize: '11px',
              }}>
                {activeEventsCount}
              </span>
            </button>

            {isOrganizer && (
              <>
                <button
                  type="button"
                  onClick={() => setStatusFilter('past')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '800',
                    border: 'none',
                    background: statusFilter === 'past' ? '#0f172a' : 'transparent',
                    color: statusFilter === 'past' ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🏁 Concluded</span>
                  <span style={{
                    background: statusFilter === 'past' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                    color: statusFilter === 'past' ? '#ffffff' : '#475569',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                  }}>
                    {pastEventsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '800',
                    border: 'none',
                    background: statusFilter === 'all' ? '#0f172a' : 'transparent',
                    color: statusFilter === 'all' ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>All ({events.length})</span>
                </button>
              </>
            )}
          </div>

          <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />

          {/* Pricing Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPricingFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '700',
                border: pricingFilter === 'all' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: pricingFilter === 'all' ? '#0f172a' : '#ffffff',
                color: pricingFilter === 'all' ? '#ffffff' : '#475569',
                cursor: 'pointer',
              }}
            >
              All Pricing
            </button>

            <button
              type="button"
              onClick={() => setPricingFilter('free')}
              style={{
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '700',
                border: pricingFilter === 'free' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: pricingFilter === 'free' ? '#0f172a' : '#ffffff',
                color: pricingFilter === 'free' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>🆓 Free</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>({freeEventsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setPricingFilter('paid')}
              style={{
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '700',
                border: pricingFilter === 'paid' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: pricingFilter === 'paid' ? '#0f172a' : '#ffffff',
                color: pricingFilter === 'paid' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>💳 Paid</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>({paidEventsCount})</span>
            </button>

            {myRegistrations.length > 0 && (
              <button
                type="button"
                onClick={() => setPricingFilter('registered')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: pricingFilter === 'registered' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  background: pricingFilter === 'registered' ? '#0f172a' : '#ffffff',
                  color: pricingFilter === 'registered' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>🎟️ My Registered</span>
                <span style={{ fontSize: '11px', opacity: 0.9, fontWeight: '800' }}>({myRegistrations.length})</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Displaying <strong>{filteredEvents.length}</strong> {statusFilter === 'active' ? 'active' : ''} event{filteredEvents.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid-cards-auto">
        {filteredEvents.map((evt) => {
          const registered = evt.registered_count || 0;
          const checkedIn = evt.checked_in_count || 0;
          const capacity = evt.capacity || 500;
          const regPercent = Math.min(100, Math.round((registered / capacity) * 100));
          const registeredInfo = registeredByEventId[evt.id];

          const startDate = new Date(evt.start_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <div
              key={evt.id}
              className="glass-panel"
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              {/* Banner Image */}
              <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                <img
                  src={evt.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'}
                  alt={evt.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.2) 60%, transparent 100%)',
                }} />

                <div style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#818cf8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {evt.category}
                  </div>

                  {registeredInfo && (
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(16, 185, 129, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid #10b981',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
                    }}>
                      <CheckCircle2 size={12} />
                      <span>REGISTERED ({registeredInfo.seatNumber ? `Seat ${registeredInfo.seatNumber}` : 'PASS'})</span>
                    </div>
                  )}

                  {evt.status === 'CANCELLED' && (
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(220, 38, 38, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid #ef4444',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      CANCELLED & REFUNDED
                    </div>
                  )}

                  {isPastEvent(evt) && evt.status !== 'CANCELLED' && (
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(71, 85, 105, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid #64748b',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      CONCLUDED
                    </div>
                  )}
                </div>

                {/* Pricing Badge (Top Right) */}
                <div style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                }}>
                  {evt.max_tier_price === 0 || (evt.paid_tier_count === 0 && evt.free_tier_count > 0) ? (
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(16, 185, 129, 0.9)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid #10b981',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}>
                      FREE EVENT
                    </div>
                  ) : evt.min_tier_price === 0 ? (
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(6, 182, 212, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid #06b6d4',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                    }}>
                      FREE + PAID
                    </div>
                  ) : (
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: 'rgba(99, 102, 241, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid #818cf8',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                    }}>
                      FROM {formatCurrency(evt.min_tier_price, evt.currency || 'INR', false)}
                    </div>
                  )}
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '16px',
                  right: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#cbd5e1',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#818cf8" />
                    <span>{startDate}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#ec4899" />
                    <span>{evt.city || evt.location}</span>
                    {evt._distanceKm != null && (
                      <span style={{
                        background: 'rgba(56, 189, 248, 0.25)',
                        border: '1px solid rgba(56, 189, 248, 0.45)',
                        color: '#7dd3fc',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '800',
                        marginLeft: '4px',
                      }}>
                        🚗 {formatDistance(evt._distanceKm)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Event Content */}
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: '#0f172a', lineHeight: '1.3' }}>
                  {evt.title}
                </h3>
                <p style={{
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: '#475569',
                  marginBottom: '18px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {evt.description}
                </p>

                {/* Admission Pricing Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: '14px',
                  marginTop: 'auto',
                  fontSize: '12px',
                }}>
                  <span style={{ color: '#64748b' }}>Pass Pricing</span>
                  <div style={{ fontWeight: '800', color: '#0f172a' }}>
                    {formatPriceRange(evt.min_tier_price, evt.max_tier_price, evt.currency || 'INR')}
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Registration Status</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {registered} / {capacity} <span style={{ color: '#64748b' }}>({regPercent}%)</span>
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${regPercent}%`,
                      background: regPercent > 85 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#0f172a',
                      borderRadius: '9999px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {evt.status === 'CANCELLED' ? (
                    <button
                      className="btn-secondary"
                      disabled
                      style={{ padding: '10px 14px', fontSize: '12px', color: '#b91c1c', borderColor: '#fecaca', cursor: 'not-allowed' }}
                    >
                      Event Cancelled
                    </button>
                  ) : isPastEvent(evt) ? (
                    <button
                      className="btn-secondary"
                      disabled
                      style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b', borderColor: '#e2e8f0', cursor: 'not-allowed' }}
                    >
                      Event Concluded
                    </button>
                  ) : registeredInfo ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => onLookupCode(registeredInfo.ticketCode)}
                        style={{
                          flex: 1,
                          padding: '10px 6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                        title="View your confirmed pass"
                      >
                        <Ticket size={13} />
                        View Pass
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setCancellationTarget({
                          ticket: {
                            id: registeredInfo.ticketCode,
                            ticket_code: registeredInfo.ticketCode,
                            seat_number: registeredInfo.seatNumber,
                            payment_amount: registeredInfo.paymentAmount,
                            currency: evt.currency || 'INR',
                          },
                          event: evt,
                        })}
                        style={{
                          padding: '10px 8px',
                          fontSize: '11px',
                          color: '#b91c1c',
                          borderColor: '#fca5a5',
                          background: '#fef2f2',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Cancel pass and claim percentage refund based on cancellation slab"
                      >
                        <XCircle size={13} color="#ef4444" />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={() => onRegister(evt)}
                      style={{ padding: '10px 14px', fontSize: '13px' }}
                    >
                      Register Pass
                      <ArrowRight size={14} />
                    </button>
                  )}

                  <button
                    className="btn-secondary"
                    onClick={() => onOpenDashboard(evt.id)}
                    style={{ padding: '10px 14px', fontSize: '13px' }}
                  >
                    View Stats ({checkedIn})
                  </button>
                </div>

                {/* Organizer Management Strip (Restricted to Organizers) */}
                {isOrganizer && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e2e8f0',
                  }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEditEvent) onEditEvent(evt);
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        fontSize: '12px',
                        color: '#0f172a',
                        gap: '6px',
                        background: '#f8fafc',
                        borderColor: '#cbd5e1',
                      }}
                      title="Postpone, prepone, or edit event schedule"
                    >
                      <Calendar size={13} color="#0f172a" />
                      Reschedule / Edit
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteEvent) onDeleteEvent(evt);
                      }}
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fca5a5',
                        borderRadius: '10px',
                        color: '#b91c1c',
                        padding: '7px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      title="Delete Event"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="glass-panel" style={{
          textAlign: 'center',
          padding: '60px 24px',
          borderRadius: '24px',
          marginTop: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
        }}>
          <Calendar size={48} color="#64748b" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#0f172a' }}>
            No Events Found
          </h3>
          <p style={{ color: '#475569', fontSize: '14px', maxWidth: '420px', margin: '0 auto 24px' }}>
            {pricingFilter !== 'all'
              ? `No events match the ${pricingFilter === 'free' ? 'Free Events' : 'Paid Events'} filter${searchTerm ? ` for "${searchTerm}"` : ''}.`
              : searchTerm
              ? `No events match "${searchTerm}". Try searching for a different keyword.`
              : 'There are currently no events scheduled in the system.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {(pricingFilter !== 'all' || searchTerm) && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setPricingFilter('all'); setSearchTerm(''); }}
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Reset Filter
              </button>
            )}
            {isOrganizer && onOpenCreateEvent && (
              <button className="btn-primary" onClick={onOpenCreateEvent} style={{ padding: '10px 18px', fontSize: '13px' }}>
                <Plus size={16} /> Create New Event
              </button>
            )}
          </div>
        </div>
      )}

      {/* Attendee Ticket Cancellation Modal */}
      {cancellationTarget && (
        <TicketCancellationModal
          ticket={cancellationTarget.ticket}
          event={cancellationTarget.event}
          currency={cancellationTarget.event?.currency || cancellationTarget.ticket?.currency || 'INR'}
          onClose={() => setCancellationTarget(null)}
          onCancelled={(cancelRes) => {
            setCancellationTarget(null);
            if (onRefreshRegistrations) {
              onRefreshRegistrations();
            }
            if (cancellationTarget.event) {
              cancellationTarget.event.registered_count = Math.max(0, (cancellationTarget.event.registered_count || 1) - 1);
            }
          }}
        />
      )}
    </div>
  );
}
