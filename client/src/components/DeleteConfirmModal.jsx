import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2, RotateCcw, ShieldCheck, Mail } from 'lucide-react';

export default function DeleteConfirmModal({ event, onClose, onConfirmDelete, organizerKey }) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState('refund'); // 'refund' | 'delete'
  const [cancelReason, setCancelReason] = useState('Event cancelled by organizer — full student refunds issued.');
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  if (!event) return null;

  const regCount = event.registered_count || 0;
  const activeKey = organizerKey || localStorage.getItem('eventpass_organizer_key') || '';

  // Cancel Event & Refund all students
  const handleCancelAndRefund = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organizer-key': activeKey,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel event and issue refunds');
      }

      setSuccessInfo(data.message);
      setTimeout(() => {
        onConfirmDelete(event.id);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Cancellation error:', err);
      setError(err.message || 'Failed to cancel event and process refunds.');
      setLoading(false);
    }
  };

  // Hard delete
  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        headers: {
          'x-organizer-key': activeKey,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete event');
      }

      onConfirmDelete(event.id);
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete event');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content animate-fade-up" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '560px', 
          width: '100%',
          maxHeight: '90vh',
          maxHeight: '90dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Event Management: Cancellation & Refunds
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{event.title}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {successInfo && (
            <div style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <ShieldCheck size={18} />
              {successInfo}
            </div>
          )}

          {/* Action Choice Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '20px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '4px',
            borderRadius: '12px',
          }}>
            <button
              type="button"
              onClick={() => setActionType('refund')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: actionType === 'refund' ? '#0f172a' : 'transparent',
                color: actionType === 'refund' ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <RotateCcw size={14} /> Cancel & Refund All Students
            </button>

            <button
              type="button"
              onClick={() => setActionType('delete')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: actionType === 'delete' ? '#dc2626' : 'transparent',
                color: actionType === 'delete' ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Trash2 size={14} /> Permanent Purge
            </button>
          </div>

          {actionType === 'refund' ? (
            <div>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '13px',
                color: '#334155',
                lineHeight: '1.5',
                marginBottom: '18px',
              }}>
                <strong style={{ color: '#0f172a' }}>🛡️ Automatic Student Refund Protection:</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: '#475569' }}>
                  <li>All <strong>{regCount} registered attendee pass(es)</strong> will be cancelled.</li>
                  <li>100% of ticket payments will be credited back to students' accounts.</li>
                  <li>Official cancellation and refund email receipts will be dispatched immediately.</li>
                </ul>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Reason for Cancellation (Shown to students)
                </label>
                <textarea
                  rows={2}
                  className="input-field"
                  placeholder="e.g. Auditorium renovation / Keynote guest speaker unavailable..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCancelAndRefund}
                  disabled={loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                  Confirm Cancellation & Refund Students
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '13px',
                color: '#991b1b',
                lineHeight: '1.5',
                marginBottom: '24px',
              }}>
                <strong style={{ color: '#b91c1c' }}>⚠️ Warning: Permanent Hard Delete</strong>
                <p style={{ marginTop: '6px' }}>
                  This will immediately erase the event and all {regCount} ticket record(s) from the database without recording refund references.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDelete}
                  disabled={loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                  }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Permanently Delete Event
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
