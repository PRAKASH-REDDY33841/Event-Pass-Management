import React, { useState, useEffect } from 'react';
import { 
  Ticket, Calendar, MapPin, ShieldCheck, ArrowRight, Download, 
  Search, XCircle, CheckCircle2, Clock, Sparkles, RefreshCw, AlertCircle, Copy, Check 
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { downloadCalendarEvent } from '../utils/calendar';
import TicketCancellationModal from './TicketCancellationModal';

export default function MyPassesView({ 
  onOpenPass, 
  onExploreEvents, 
  currency = 'USD', 
  onPassesCountChange,
  attendeeUser,
  onOpenAttendeeLogin,
  onAttendeeLogout,
  onAttendeeLogin,
  onOpenProfile,
}) {
  const [emailInput, setEmailInput] = useState(() => attendeeUser?.email || localStorage.getItem('eventpass_attendee_email') || '');
  const [activeEmail, setActiveEmail] = useState(() => attendeeUser?.email || localStorage.getItem('eventpass_attendee_email') || '');
  const [loading, setLoading] = useState(false);
  const [passes, setPasses] = useState([]);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [cancellationTarget, setCancellationTarget] = useState(null);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming' | 'past' | 'cancelled'
  const [pastSubFilter, setPastSubFilter] = useState('all'); // 'all' | 'attended' | 'missed'

  // Keep activeEmail in sync with attendeeUser session
  useEffect(() => {
    if (attendeeUser?.email) {
      setActiveEmail(attendeeUser.email);
      setEmailInput(attendeeUser.email);
    } else {
      setActiveEmail('');
      setEmailInput('');
      setPasses([]);
    }
  }, [attendeeUser?.email]);

  const fetchPasses = async (emailToFetch) => {
    if (!emailToFetch || !emailToFetch.includes('@')) {
      setPasses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch from lookup-by-email endpoint
      const res = await fetch(`/api/tickets/lookup-by-email?email=${encodeURIComponent(emailToFetch.trim().toLowerCase())}`);
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.tickets)) {
        setPasses(data.tickets);
      } else if (res.status === 404) {
        setPasses([]);
      } else {
        throw new Error(data.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      console.warn('Failed to load registered passes:', err.message);
      setPasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeEmail) {
      fetchPasses(activeEmail);
    } else {
      setPasses([]);
    }
  }, [activeEmail]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) return;
    const clean = emailInput.trim().toLowerCase();
    setActiveEmail(clean);
    fetchPasses(clean);
    if (onAttendeeLogin) {
      onAttendeeLogin({ email: clean, name: clean.split('@')[0] });
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const now = new Date();
  const isEventPast = (p) => {
    if (!p.start_date) return false;
    const endTimestamp = p.end_date ? new Date(p.end_date).getTime() : 0;
    const startTimestamp = p.start_date ? new Date(p.start_date).getTime() : 0;
    const effectiveEnd = Math.max(endTimestamp, startTimestamp);
    return effectiveEnd > 0 && effectiveEnd < now.getTime();
  };

  const isCancelled = (p) => p.status === 'CANCELLED' || p.status === 'CANCELLED_REFUNDED';

  const upcomingPasses = passes.filter(p => !isCancelled(p) && !isEventPast(p));
  const pastPasses = passes.filter(p => !isCancelled(p) && isEventPast(p));
  const attendedPasses = pastPasses.filter(p => p.status === 'CHECKED_IN');
  const missedPasses = pastPasses.filter(p => p.status !== 'CHECKED_IN');
  const cancelledPasses = passes.filter(p => isCancelled(p));

  useEffect(() => {
    if (onPassesCountChange) {
      onPassesCountChange(upcomingPasses.length);
    }
  }, [upcomingPasses.length, onPassesCountChange]);

  let displayedPasses = [];
  if (filterTab === 'upcoming') {
    displayedPasses = upcomingPasses;
  } else if (filterTab === 'past') {
    if (pastSubFilter === 'attended') {
      displayedPasses = attendedPasses;
    } else if (pastSubFilter === 'missed') {
      displayedPasses = missedPasses;
    } else {
      displayedPasses = pastPasses;
    }
  } else if (filterTab === 'cancelled') {
    displayedPasses = cancelledPasses;
  }

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div className="hero-card-responsive" style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            fontSize: '11px',
            fontWeight: '800',
            marginBottom: '14px',
            letterSpacing: '0.04em',
          }}>
            <Ticket size={13} color="#0f172a" />
            ATTENDEE PASS DASHBOARD
          </div>

          <h1 style={{
            fontSize: '34px',
            fontWeight: '900',
            color: '#0f172a',
            lineHeight: '1.2',
            marginBottom: '10px',
            letterSpacing: '-0.02em',
          }}>
            My Registered Passes & Events
          </h1>

          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
            View your verified cryptographic QR passes, check reserved seats, and manage pass cancellations and refunds.
          </p>
        </div>

        {/* Attendee Profile or Lookup Card */}
        {attendeeUser ? (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 20px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ACTIVE ATTENDEE ACCOUNT
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {passes.length} Pass{passes.length !== 1 ? 'es' : ''} on file
              </span>
            </div>

            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
              {attendeeUser.name || attendeeUser.email}
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
              {attendeeUser.email}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={onOpenProfile}
                style={{ padding: '7px 12px', fontSize: '12px' }}
                title="View and edit profile details, bio, and avatar"
              >
                Profile & Bio
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onOpenAttendeeLogin}
                style={{ flex: 1, padding: '7px 12px', fontSize: '12px' }}
                title="Switch to another attendee user"
              >
                Switch Account
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onAttendeeLogout}
                style={{ padding: '7px 12px', fontSize: '12px', color: '#b91c1c', borderColor: '#fca5a5' }}
                title="Log out from attendee profile"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '18px 20px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Enter Attendee Email to Access Passes:
            </div>

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: '12px' }}
              >
                Sign In
              </button>
            </form>

            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
              Enter your email to view only your confirmed tickets and seat bookings.
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: filterTab === 'past' && pastPasses.length > 0 ? '16px' : '28px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* 1. Upcoming Passes */}
          <button
            type="button"
            onClick={() => setFilterTab('upcoming')}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '800',
              border: filterTab === 'upcoming' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: filterTab === 'upcoming' ? '#0f172a' : '#ffffff',
              color: filterTab === 'upcoming' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🟢 Upcoming Passes</span>
            <span style={{
              background: filterTab === 'upcoming' ? 'rgba(255, 255, 255, 0.2)' : '#f1f5f9',
              color: filterTab === 'upcoming' ? '#ffffff' : '#0f172a',
              padding: '1px 7px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '900',
            }}>
              {upcomingPasses.length}
            </span>
          </button>

          {/* 2. Past Events */}
          <button
            type="button"
            onClick={() => setFilterTab('past')}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '800',
              border: filterTab === 'past' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: filterTab === 'past' ? '#0f172a' : '#ffffff',
              color: filterTab === 'past' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🏁 Past Events</span>
            <span style={{
              background: filterTab === 'past' ? 'rgba(255, 255, 255, 0.2)' : '#f1f5f9',
              color: filterTab === 'past' ? '#ffffff' : '#0f172a',
              padding: '1px 7px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '900',
            }}>
              {pastPasses.length}
            </span>
          </button>

          {/* 3. Cancelled & Refunded */}
          <button
            type="button"
            onClick={() => setFilterTab('cancelled')}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '800',
              border: filterTab === 'cancelled' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: filterTab === 'cancelled' ? '#0f172a' : '#ffffff',
              color: filterTab === 'cancelled' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>❌ Cancelled & Refunded</span>
            <span style={{
              background: filterTab === 'cancelled' ? 'rgba(255, 255, 255, 0.2)' : '#f1f5f9',
              color: filterTab === 'cancelled' ? '#ffffff' : '#0f172a',
              padding: '1px 7px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '900',
            }}>
              {cancelledPasses.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => fetchPasses(activeEmail)}
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh Passes
        </button>
      </div>

      {/* Sub-Filters Bar for Past Events (Attended vs Not Attended) */}
      {filterTab === 'past' && pastPasses.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          marginBottom: '26px',
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginRight: '4px' }}>
            Attendance Filter:
          </span>

          <button
            type="button"
            onClick={() => setPastSubFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: '700',
              border: pastSubFilter === 'all' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: pastSubFilter === 'all' ? '#0f172a' : '#ffffff',
              color: pastSubFilter === 'all' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All Past Events ({pastPasses.length})
          </button>

          <button
            type="button"
            onClick={() => setPastSubFilter('attended')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: '700',
              border: pastSubFilter === 'attended' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: pastSubFilter === 'attended' ? '#0f172a' : '#ffffff',
              color: pastSubFilter === 'attended' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <CheckCircle2 size={13} color={pastSubFilter === 'attended' ? '#ffffff' : '#16a34a'} />
            <span>Attended ({attendedPasses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPastSubFilter('missed')}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: '700',
              border: pastSubFilter === 'missed' ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: pastSubFilter === 'missed' ? '#0f172a' : '#ffffff',
              color: pastSubFilter === 'missed' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Clock size={13} color={pastSubFilter === 'missed' ? '#ffffff' : '#d97706'} />
            <span>Not Attended / Missed ({missedPasses.length})</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="shimmer" style={{ maxWidth: '600px', height: '240px', margin: '0 auto', borderRadius: '16px' }} />
          <p style={{ marginTop: '16px', color: '#94a3b8' }}>Loading registered passes...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedPasses.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          maxWidth: '640px',
          margin: '0 auto',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Ticket size={32} color="#0f172a" />
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
            {filterTab === 'upcoming' 
              ? 'No Upcoming Passes' 
              : filterTab === 'past' 
              ? (pastSubFilter === 'attended' 
                  ? 'No Attended Events Found' 
                  : pastSubFilter === 'missed' 
                  ? 'No Missed Events Found' 
                  : 'No Past Event History')
              : 'No Cancelled Passes'}
          </h3>

          <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px' }}>
            {filterTab === 'upcoming'
              ? (activeEmail 
                  ? `No upcoming active passes registered to "${activeEmail}". Explore our catalog to register for upcoming events.` 
                  : 'Enter your attendee email address above to view your upcoming passes and admission QR codes.')
              : filterTab === 'past'
              ? (pastSubFilter === 'attended'
                  ? 'You do not have any past events recorded as attended.'
                  : pastSubFilter === 'missed'
                  ? 'You have zero missed events in your history.'
                  : 'None of your registered events have concluded yet.')
              : 'You have not cancelled any event passes.'}
          </p>

          {filterTab === 'upcoming' && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              {pastPasses.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setFilterTab('past')}
                  style={{ padding: '12px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <span>🏁 View Past Events ({pastPasses.length})</span>
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={onExploreEvents}
                style={{ padding: '12px 24px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                Explore Events Catalog
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid of Registered Passes */}
      {!loading && displayedPasses.length > 0 && (
        <div className="grid-cards-auto">
          {displayedPasses.map((pass) => {
            const isCancelled = pass.status === 'CANCELLED' || pass.status === 'CANCELLED_REFUNDED';
            const isCheckedIn = pass.status === 'CHECKED_IN';
            const isPast = isEventPast(pass);
            const isPaid = Number(pass.payment_amount) > 0;

            const formattedDate = pass.start_date ? new Date(pass.start_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }) : 'Event Schedule';

            // Card border & header style based on state
            let borderColor = '#e2e8f0';
            let headerBg = '#f8fafc';
            if (isCancelled) {
              borderColor = '#fecaca';
              headerBg = '#fef2f2';
            } else if (isPast) {
              if (isCheckedIn) {
                borderColor = '#bbf7d0';
                headerBg = '#f0fdf4';
              } else {
                borderColor = '#fde68a';
                headerBg = '#fefce8';
              }
            } else if (isCheckedIn) {
              borderColor = '#bfdbfe';
              headerBg = '#eff6ff';
            }

            return (
              <div
                key={pass.id}
                className="glass-panel animate-fade-up"
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: `1px solid ${borderColor}`,
                  background: '#ffffff',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                {/* Top Badge Strip */}
                <div style={{
                  padding: '12px 18px',
                  background: headerBg,
                  borderBottom: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  fontWeight: '800',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isCancelled ? (
                      <>
                        <XCircle size={14} color="#b91c1c" />
                        <span style={{ color: '#991b1b' }}>
                          CANCELLED & REFUNDED {pass.refund_percentage != null ? `(${pass.refund_percentage}%)` : ''}
                        </span>
                      </>
                    ) : isPast ? (
                      isCheckedIn ? (
                        <>
                          <CheckCircle2 size={14} color="#15803d" />
                          <span style={{ color: '#166534' }}>✅ ATTENDED / CHECKED IN</span>
                        </>
                      ) : (
                        <>
                          <Clock size={14} color="#b45309" />
                          <span style={{ color: '#92400e' }}>⚠️ NOT ATTENDED / MISSED</span>
                        </>
                      )
                    ) : isCheckedIn ? (
                      <>
                        <CheckCircle2 size={14} color="#1d4ed8" />
                        <span style={{ color: '#1e40af' }}>ADMITTED / CHECKED IN</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} color="#15803d" />
                        <span style={{ color: '#166534' }}>VALID FOR ADMISSION</span>
                      </>
                    )}
                  </div>

                  <span style={{
                    color: isPaid ? '#0f172a' : '#64748b',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: '700',
                  }}>
                    {isPaid ? formatCurrency(pass.payment_amount, pass.currency || 'INR') : 'FREE PASS'}
                  </span>
                </div>

                {/* Body Details */}
                <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="badge-vip" style={{ fontSize: '10px' }}>{pass.tier_name || 'Pass'}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Cryptographic Ticket</span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '14px', lineHeight: '1.3' }}>
                    {pass.event_title || 'Event Pass'}
                  </h3>

                  {/* Seat & Code Highlight Box */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        RESERVED SEAT
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
                        💺 Seat {pass.seat_number || 'General Entry'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        PASS CODE
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                          {pass.ticket_code}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(pass.ticket_code)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                          title="Copy pass code"
                        >
                          {copiedCode === pass.ticket_code ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Schedule & Location */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569', marginBottom: '16px' }}>
                    {pass.start_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="#0f172a" />
                        <span>{formattedDate}</span>
                      </div>
                    )}
                    {pass.venue_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="#0f172a" />
                        <span>{pass.venue_name}{pass.location ? `, ${pass.location}` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Attendance Note if Event Concluded */}
                  {isPast && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isCheckedIn ? '#f0fdf4' : '#fefce8',
                      border: isCheckedIn ? '1px solid #bbf7d0' : '1px solid #fef08a',
                      color: isCheckedIn ? '#166534' : '#854d0e',
                      fontSize: '11px',
                      fontWeight: '600',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      {isCheckedIn ? (
                        <>
                          <CheckCircle2 size={13} color="#15803d" />
                          <span>Attendance Confirmed: Pass was scanned & admitted at the door.</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} color="#b45309" />
                          <span>Event Concluded: This event is over. The pass was not checked in.</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Refund Notice if Cancelled */}
                  {isCancelled && Number(pass.refund_amount) > 0 && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#166534',
                      fontSize: '11px',
                      marginBottom: '16px',
                    }}>
                      🔄 Refunded <strong>{formatCurrency(pass.refund_amount, pass.currency || 'INR')}</strong> via original payment ({pass.refund_transaction_id || 'PROCESSED'}).
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => onOpenPass(pass.ticket_code)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Ticket size={14} />
                      {isPast ? 'View Pass Record' : 'View QR Pass'}
                    </button>

                    {/* Only show Cancel button if event is NOT cancelled, NOT checked in, and NOT past! */}
                    {!isCancelled && !isCheckedIn && !isPast && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setCancellationTarget({
                          ticket: pass,
                          event: { id: pass.event_id, title: pass.event_title, start_date: pass.start_date },
                        })}
                        style={{
                          padding: '10px 12px',
                          fontSize: '12px',
                          color: '#b91c1c',
                          borderColor: '#fca5a5',
                          background: '#fef2f2',
                        }}
                        title="Cancel pass and claim percentage refund"
                      >
                        <XCircle size={14} color="#ef4444" />
                        Cancel & Refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Cancellation Modal */}
      {cancellationTarget && (
        <TicketCancellationModal
          ticket={cancellationTarget.ticket}
          event={cancellationTarget.event}
          currency={cancellationTarget.ticket?.currency || cancellationTarget.event?.currency || 'INR'}
          onClose={() => setCancellationTarget(null)}
          onCancelled={() => {
            setCancellationTarget(null);
            fetchPasses(activeEmail);
          }}
        />
      )}
    </div>
  );
}

