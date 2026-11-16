import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, XCircle, ExternalLink, RefreshCw, Eye, Search, X, Clock, Zap, AlertCircle } from 'lucide-react';

export default function EmailOutboxView() {
  const [activeSubTab, setActiveSubTab] = useState('outbox'); // 'outbox' | 'scheduled'
  const [emails, setEmails] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringId, setTriggeringId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewEmailId, setPreviewEmailId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [outboxRes, schedRes] = await Promise.all([
        fetch('/api/outbox'),
        fetch('/api/outbox/scheduled'),
      ]);
      const outboxData = await outboxRes.json();
      const schedData = await schedRes.json();

      if (outboxData.success) setEmails(outboxData.emails || []);
      if (schedData.success) setScheduled(schedData.notifications || []);
    } catch (err) {
      console.error('Failed to load email outbox / scheduled:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerNow = async (notifId) => {
    setTriggeringId(notifId);
    try {
      const res = await fetch(`/api/outbox/scheduled/${notifId}/trigger`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`✓ 5-Hour notification sent! ${data.previewUrl ? 'Ethereal preview link ready.' : ''}`);
        setTimeout(() => setActionMessage(null), 5000);
        await loadData();
      } else {
        alert(data.error || 'Failed to dispatch notification');
      }
    } catch (err) {
      console.error('Trigger error:', err);
    } finally {
      setTriggeringId(null);
    }
  };

  const filteredEmails = emails.filter(e => 
    e.to_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.to_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredScheduled = scheduled.filter(s =>
    s.attendee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.attendee_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.event_title && s.event_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 9px',
              borderRadius: '6px',
              background: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Automated Dispatch Engine
            </span>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>SMTP & 5-Hour Scheduled Dispatcher</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>
            Email Outbox & Scheduled Notifications
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search recipient or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px 8px 34px', fontSize: '13px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            />
          </div>

          <button className="btn-secondary" onClick={loadData} style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '12px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          fontSize: '13px',
          fontWeight: '700',
          marginBottom: '20px',
        }}>
          {actionMessage}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '24px',
        paddingBottom: '12px',
      }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('outbox')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: activeSubTab === 'outbox' ? '1px solid #0f172a' : '1px solid #e2e8f0',
            background: activeSubTab === 'outbox' ? '#0f172a' : '#ffffff',
            color: activeSubTab === 'outbox' ? '#ffffff' : '#475569',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Mail size={16} />
          <span>Dispatched Outbox ({emails.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('scheduled')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: activeSubTab === 'scheduled' ? '1px solid #0f172a' : '1px solid #e2e8f0',
            background: activeSubTab === 'scheduled' ? '#0f172a' : '#ffffff',
            color: activeSubTab === 'scheduled' ? '#ffffff' : '#475569',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={16} />
          <span>⏰ 5-Hour Scheduled Notifications ({scheduled.length})</span>
        </button>
      </div>

      {/* Outbox Table */}
      {activeSubTab === 'outbox' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Recipient</th>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Subject</th>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Sent Time</th>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmails.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      {loading ? 'Loading outbox logs...' : 'No emails dispatched yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredEmails.map(email => (
                    <tr
                      key={email.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{email.to_name}</div>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>{email.to_email}</div>
                      </td>

                      <td style={{ padding: '14px 20px', color: '#0f172a', fontWeight: '600' }}>
                        {email.subject}
                      </td>

                      <td style={{ padding: '14px 20px' }}>
                        {email.status === 'SENT' ? (
                          <span className="badge-status-valid">
                            <CheckCircle2 size={12} /> Dispatched
                          </span>
                        ) : (
                          <span className="badge-status-revoked">
                            <XCircle size={12} /> Failed
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '12px' }}>
                        {new Date(email.sent_at).toLocaleString()}
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn-primary"
                            onClick={() => setPreviewEmailId(email.id)}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            <Eye size={13} /> Preview HTML
                          </button>

                          {email.preview_url && (
                            <a
                              href={email.preview_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                            >
                              <ExternalLink size={13} /> Ethereal
                            </a>
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
      )}

      {/* Scheduled Notifications Table */}
      {activeSubTab === 'scheduled' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Attendee</th>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Event & Seat</th>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Scheduled Dispatch Time</th>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '14px 20px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredScheduled.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      {loading ? 'Loading scheduled queue...' : 'No notifications currently queued. Register a pass to queue an automatic 5-hour notification!'}
                    </td>
                  </tr>
                ) : (
                  filteredScheduled.map(item => {
                    const isDue = new Date(item.scheduled_for) <= new Date();
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.attendee_name}</div>
                          <div style={{ color: '#64748b', fontSize: '12px' }}>{item.attendee_email}</div>
                        </td>

                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.event_title || 'Event Pass'}</div>
                          <div style={{ color: '#475569', fontSize: '12px' }}>
                            Seat <strong style={{ color: '#0f172a' }}>{item.seat_number || 'General'}</strong> • {item.tier_name}
                          </div>
                        </td>

                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ color: '#0f172a', fontWeight: '700' }}>
                            {new Date(item.scheduled_for).toLocaleString()}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '11px' }}>
                            {item.status === 'SENT' ? 'Completed' : 'Queued (+5 Hours post-registration)'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 20px' }}>
                          {item.status === 'SENT' ? (
                            <span className="badge-status-valid">
                              <CheckCircle2 size={12} /> Dispatched
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              color: '#d97706',
                              fontSize: '11px',
                              fontWeight: '700',
                            }}>
                              <Clock size={12} /> PENDING (In 5h)
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            {item.status === 'PENDING' ? (
                              <button
                                className="btn-primary"
                                onClick={() => handleTriggerNow(item.id)}
                                disabled={triggeringId === item.id}
                                style={{
                                  padding: '6px 14px',
                                  fontSize: '12px',
                                }}
                                title="Instantly trigger and send this notification now for testing"
                              >
                                <Zap size={13} />
                                {triggeringId === item.id ? 'Sending...' : '⚡ Trigger Now (Demo)'}
                              </button>
                            ) : (
                              item.preview_url && (
                                <a
                                  href={item.preview_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                                >
                                  <ExternalLink size={13} /> View Email
                                </a>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HTML Email Preview Modal */}
      {previewEmailId && (
        <div className="modal-backdrop" onClick={() => setPreviewEmailId(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', height: '85vh', display: 'flex', flexDirection: 'column', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px' }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="#0f172a" />
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  Rendered Email Preview with Embedded QR Ticket
                </span>
              </div>
              <button
                onClick={() => setPreviewEmailId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <iframe
              src={`/api/outbox/${previewEmailId}`}
              title="Rendered Email Preview"
              style={{
                flex: 1,
                width: '100%',
                border: 'none',
                background: '#ffffff',
                borderBottomLeftRadius: '20px',
                borderBottomRightRadius: '20px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
