import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, Clock, Activity, ShieldCheck, Download, 
  Search, Filter, RefreshCw, AlertCircle, ArrowUpRight, Check, XCircle, RotateCcw, ExternalLink,
  Calendar, Trash2, Plus
} from 'lucide-react';

export default function LiveDashboard({ events, selectedEventId, onSelectEvent, onOpenPass, onEditEvent, onDeleteEvent, onOpenCreateEvent, socket, isOrganizer, organizerKey }) {
  const [currentEventId, setCurrentEventId] = useState(selectedEventId || events[0]?.id || '');
  const [stats, setStats] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [latestScanAlert, setLatestScanAlert] = useState(null);

  // Sync current event when prop changes
  useEffect(() => {
    if (selectedEventId) {
      setCurrentEventId(selectedEventId);
    }
  }, [selectedEventId]);

  // Load stats and attendees
  const loadDashboardData = async (eventId) => {
    if (!eventId) return;
    try {
      const [statsRes, attendeesRes] = await Promise.all([
        fetch(`/api/stats/${eventId}`),
        fetch(`/api/tickets/event/${eventId}`),
      ]);

      const statsData = await statsRes.json();
      const attendeesData = await attendeesRes.json();

      if (statsData.success) setStats(statsData.stats);
      if (attendeesData.success) setAttendees(attendeesData.tickets);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(currentEventId);
  }, [currentEventId]);

  // Socket.io real-time listeners
  useEffect(() => {
    if (!socket || !currentEventId) return;

    socket.emit('join:event', currentEventId);

    const handleStatsUpdated = (newStats) => {
      if (newStats.eventId === currentEventId) {
        setStats(newStats);
        // Refresh attendee table silently
        fetch(`/api/tickets/event/${currentEventId}`)
          .then(res => res.json())
          .then(d => { if (d.success) setAttendees(d.tickets); });
      }
    };

    const handleTicketCheckedIn = (payload) => {
      setLatestScanAlert(payload);
      setTimeout(() => setLatestScanAlert(null), 5000);
    };

    socket.on('stats:updated', handleStatsUpdated);
    socket.on('ticket:checked_in', handleTicketCheckedIn);

    return () => {
      socket.emit('leave:event', currentEventId);
      socket.off('stats:updated', handleStatsUpdated);
      socket.off('ticket:checked_in', handleTicketCheckedIn);
    };
  }, [socket, currentEventId]);

  // Manual Check-In or Reset
  const handleOverride = async (ticketId, action) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/override`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-organizer-key': organizerKey || '',
        },
        body: JSON.stringify({ action, door_name: 'Organizer Dashboard Override' }),
      });
      const data = await res.json();
      if (data.success) {
        loadDashboardData(currentEventId);
      }
    } catch (e) {
      console.error('Override error:', e);
    }
  };

  // Revoke ticket
  const handleRevoke = async (ticketId, name) => {
    if (!window.confirm(`Are you sure you want to REVOKE the pass for ${name}? This will permanently invalidate their cryptographic signature.`)) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/revoke`, { 
        method: 'DELETE',
        headers: {
          'x-organizer-key': organizerKey || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        loadDashboardData(currentEventId);
      }
    } catch (e) {
      console.error('Revoke error:', e);
    }
  };

  // Refund ticket
  const handleRefundTicket = async (ticketId, name, amount) => {
    if (!window.confirm(`Issue 100% refund of $${Number(amount).toFixed(2)} to ${name}? This will invalidate their ticket pass.`)) return;
    try {
      const activeKey = organizerKey || localStorage.getItem('eventpass_organizer_key') || '';
      const res = await fetch(`/api/tickets/${ticketId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organizer-key': activeKey,
        },
        body: JSON.stringify({ reason: 'Student refund processed via organizer dashboard' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to refund ticket');
      }
      loadDashboardData(currentEventId);
    } catch (e) {
      alert(e.message || 'Refund error');
    }
  };

  // Export attendee roster to CSV
  const handleExportCsv = () => {
    if (!attendees || attendees.length === 0) return;
    const headers = ['Ticket Code', 'Attendee Name', 'Email', 'Seat', 'Tier', 'Status', 'Payment Status', 'Amount', 'Txn ID', 'Checked In At', 'Registered At'];
    const rows = attendees.map(t => [
      t.ticket_code,
      `"${t.attendee_name}"`,
      t.attendee_email,
      `"${t.seat_number || 'General'}"`,
      `"${t.tier_name}"`,
      t.status,
      t.payment_status || 'FREE',
      t.payment_amount || 0,
      t.transaction_id || '',
      t.checked_in_at || '',
      t.created_at,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendees-${currentEventId}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter attendees
  const filteredAttendees = attendees.filter(a => {
    const matchesSearch = 
      a.attendee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.attendee_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ticket_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesTier = tierFilter === 'ALL' || a.tier_name === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  if (!events || events.length === 0) {
    return (
      <div style={{ maxWidth: '800px', margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '60px 32px',
          borderRadius: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <Calendar size={32} color="#0f172a" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>No Active Events</h2>
          <p style={{ color: '#475569', fontSize: '15px', marginBottom: '24px' }}>
            Create an event to start monitoring live entrance scans and issuing cryptographic tickets.
          </p>
          {onOpenCreateEvent && (
            <button className="btn-primary" onClick={onOpenCreateEvent}>
              <Plus size={16} /> Create New Event
            </button>
          )}
        </div>
      </div>
    );
  }

  const selectedEvent = events.find(e => e.id === currentEventId) || events[0];

  return (
    <div className="page-container">
      {/* Real-time scan flash notification */}
      {latestScanAlert && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 90,
          background: '#0f172a',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'fade-up 0.25s ease-out',
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '0.04em' }}>LIVE ADMITTANCE!</div>
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              {latestScanAlert.ticket?.attendee_name} entered at {latestScanAlert.doorName}
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Event Switcher */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '28px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="live-dot" />
            <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#059669', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Live Socket.IO Stream Active
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>
            Real-Time Attendance Dashboard
          </h1>
        </div>

        {/* Event Selector & Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <select
            className="select-field"
            value={currentEventId}
            onChange={(e) => {
              setCurrentEventId(e.target.value);
              if (onSelectEvent) onSelectEvent(e.target.value);
            }}
            style={{ minWidth: '240px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>

          <button
            className="btn-secondary"
            onClick={() => loadDashboardData(currentEventId)}
            style={{ padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            title="Refresh Data"
          >
            <RefreshCw size={15} />
          </button>

          <button
            className="btn-secondary"
            onClick={handleExportCsv}
            style={{ padding: '10px 16px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
          >
            <Download size={15} />
            Export CSV
          </button>

          {selectedEvent && isOrganizer && (
            <>
              <button
                className="btn-secondary"
                onClick={() => onEditEvent && onEditEvent(selectedEvent)}
                style={{ padding: '10px 14px', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                title="Postpone, prepone, or edit event schedule"
              >
                <Calendar size={15} color="#0f172a" />
                <span>Reschedule / Edit</span>
              </button>

              <button
                type="button"
                className="btn-danger"
                onClick={() => onDeleteEvent && onDeleteEvent(selectedEvent)}
                style={{ padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Delete this event"
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '20px',
        marginBottom: '28px',
      }}>
        {/* Total Registered */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Total Registered</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#0f172a" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
            {stats ? stats.totalRegistered : 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Venue Capacity: <strong style={{ color: '#0f172a' }}>{stats ? stats.capacity : 500}</strong>
          </div>
        </div>

        {/* Checked In */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Checked In</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} color="#059669" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#059669' }}>
              {stats ? stats.totalCheckedIn : 0}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#059669' }}>
              ({stats ? stats.checkInRate : 0}%)
            </div>
          </div>
          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${stats ? stats.checkInRate : 0}%`,
              background: '#059669',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Remaining Attendees */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Awaiting Arrival</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#d97706', marginBottom: '8px' }}>
            {stats ? stats.pendingCheckIn : 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Passes not yet scanned at door
          </div>
        </div>

        {/* Check-In Velocity */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Check-In Velocity</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={18} color="#0f172a" />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
            {stats ? stats.recentVelocity : 0} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>/ 15m</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Live gate throughput rate
          </div>
        </div>
      </div>

      {/* Middle Section: Live Check-In Feed + Tier Breakdown */}
      <div className="grid-dashboard-middle">
        {/* Live Stream Ticker */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={16} color="#059669" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                Real-Time Gate Entrance Stream
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Latest 20 audit logs</span>
          </div>

          {!stats || !stats.recentScans || stats.recentScans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontSize: '13px' }}>
              No check-in activity recorded yet for this event.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {stats.recentScans.map(scan => (
                <div
                  key={scan.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: scan.scan_result === 'SUCCESS' ? '#059669' : scan.scan_result === 'DUPLICATE' ? '#d97706' : '#dc2626',
                    }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                        {scan.attendee_name || 'Guest'} <span style={{ color: '#64748b', fontWeight: '500', fontSize: '12px' }}>({scan.ticket_code})</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {scan.door_name} • Scanned by {scan.scanned_by}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                      {new Date(scan.scanned_at).toLocaleTimeString()}
                    </div>
                    <div>
                      {scan.scan_result === 'SUCCESS' && <span className="badge-status-valid" style={{ fontSize: '10px' }}>ADMITTED</span>}
                      {scan.scan_result === 'DUPLICATE' && <span style={{ color: '#d97706', fontSize: '10px', fontWeight: '800' }}>DUPLICATE</span>}
                      {scan.scan_result !== 'SUCCESS' && scan.scan_result !== 'DUPLICATE' && <span className="badge-status-revoked" style={{ fontSize: '10px' }}>DENIED</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tier Attendance Breakdown Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
            Ticket Tier Attendance
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {stats?.tiers?.map(t => {
              const checkedIn = t.checked_in || 0;
              const total = t.total || 0;
              const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
              return (
                <div key={t.tier_name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{t.tier_name}</span>
                    <span style={{ color: '#64748b', fontWeight: '700' }}>{checkedIn} / {total} ({pct}%)</span>
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#0f172a', borderRadius: '9999px' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Door throughput breakdown */}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '20px', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
              Entrance Gates Throughput
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {stats?.doors?.map(d => (
                <div key={d.door_name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#475569' }}>{d.door_name}</span>
                  <strong style={{ color: '#0f172a' }}>{d.count} checked in</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Attendee Management & Verification Roster */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              Attendee Roster & Access Controls
            </h3>
            <p style={{ fontSize: '13px', color: '#475569' }}>
              Search, verify credentials, override entrance checks, or inspect digital passes.
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search name, code, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px 8px 32px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              />
            </div>

            {/* Status Filter */}
            <select
              className="select-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 28px 8px 10px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="VALID">Pending Valid</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="REVOKED">Revoked</option>
              <option value="CANCELLED_REFUNDED">Refunded / Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Attendee</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Seat</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Ticket Code</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Tier</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Status</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Payment / Billing</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Check-In Details</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No attendees match the current filters.
                  </td>
                </tr>
              ) : (
                filteredAttendees.map(att => (
                  <tr
                    key={att.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{att.attendee_name}</div>
                      <div style={{ color: '#64748b', fontSize: '11.5px' }}>{att.attendee_email}</div>
                    </td>

                    <td style={{ padding: '14px 20px', fontWeight: '700', color: '#0f172a' }}>
                      {att.seat_number ? `💺 ${att.seat_number}` : 'General'}
                    </td>

                    <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#0f172a' }}>
                      {att.ticket_code}
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <span className={att.tier_name.includes('VIP') ? 'badge-vip' : att.tier_name.includes('Student') ? 'badge-stu' : 'badge-gen'} style={{ fontSize: '10px' }}>
                        {att.tier_name}
                      </span>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      {att.status === 'CHECKED_IN' && (
                        <span className="badge-status-checked">
                          <CheckCircle2 size={12} /> Checked In
                        </span>
                      )}
                      {att.status === 'VALID' && (
                        <span className="badge-status-valid">
                          <ShieldCheck size={12} /> Valid
                        </span>
                      )}
                      {att.status === 'REVOKED' && (
                        <span className="badge-status-revoked">
                          <XCircle size={12} /> Revoked
                        </span>
                      )}
                      {(att.status === 'CANCELLED_REFUNDED' || att.status === 'CANCELLED') && (
                        <span className="badge-status-revoked" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
                          <XCircle size={12} color="#dc2626" /> Refunded
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 20px', fontSize: '12px' }}>
                      {att.status === 'CANCELLED_REFUNDED' || att.payment_status === 'REFUNDED' ? (
                        <div>
                          <strong style={{ color: '#dc2626' }}>🔄 Refunded (${Number(att.refund_amount || att.payment_amount).toFixed(2)})</strong>
                          <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>{att.refund_transaction_id || 'PROCESSED'}</div>
                        </div>
                      ) : Number(att.payment_amount) > 0 ? (
                        <div>
                          <strong style={{ color: '#059669' }}>${Number(att.payment_amount).toFixed(2)}</strong> ({att.payment_method || 'CARD'})
                          <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>{att.transaction_id || 'PAID'}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#475569', fontWeight: '600' }}>🎓 Free Student Pass</span>
                      )}
                    </td>

                    <td style={{ padding: '14px 20px', color: '#475569', fontSize: '12px' }}>
                      {att.checked_in_at ? (
                        <div>
                          <strong style={{ color: '#0f172a' }}>{new Date(att.checked_in_at).toLocaleTimeString()}</strong>
                          <div>{att.check_in_door || 'Door'}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b' }}>Not yet scanned</span>
                      )}
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          onClick={() => onOpenPass(att.ticket_code)}
                          style={{ padding: '6px 10px', fontSize: '11px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                          title="View Digital Pass"
                        >
                          <ExternalLink size={13} />
                        </button>

                        {isOrganizer && att.status === 'VALID' && (
                          <button
                            className="btn-success"
                            onClick={() => handleOverride(att.id, 'CHECK_IN')}
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            title="Manually Admit Attendee"
                          >
                            <Check size={13} /> Admit
                          </button>
                        )}

                        {isOrganizer && att.status === 'CHECKED_IN' && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleOverride(att.id, 'RESET')}
                            style={{ padding: '6px 10px', fontSize: '11px', color: '#d97706', background: '#ffffff', border: '1px solid #cbd5e1' }}
                            title="Reset back to Pending Valid"
                          >
                            <RotateCcw size={13} /> Reset
                          </button>
                        )}

                        {isOrganizer && att.status === 'VALID' && Number(att.payment_amount) > 0 && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleRefundTicket(att.id, att.attendee_name, att.payment_amount)}
                            style={{ padding: '6px 10px', fontSize: '11px', color: '#0f172a', background: '#ffffff', border: '1px solid #cbd5e1' }}
                            title="Refund attendee payment"
                          >
                            <RotateCcw size={13} /> Refund
                          </button>
                        )}

                        {isOrganizer && att.status !== 'REVOKED' && (
                          <button
                            className="btn-danger"
                            onClick={() => handleRevoke(att.id, att.attendee_name)}
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            title="Revoke pass"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
