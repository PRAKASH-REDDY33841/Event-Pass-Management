import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, ShieldCheck, Download, Printer, ArrowLeft, QrCode, CheckCircle2, AlertTriangle, XCircle, Copy, Check, Clock } from 'lucide-react';
import { downloadCalendarEvent } from '../utils/calendar';
import TicketCancellationModal from './TicketCancellationModal';
import { formatCurrency } from '../utils/currency';

export default function DigitalTicketPass({ ticketCode, onBack, onOpenScanner, currency = 'USD' }) {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    async function loadTicket() {
      if (!ticketCode) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tickets/code/${encodeURIComponent(ticketCode)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Ticket not found');
        }
        setTicketData(data);
      } catch (err) {
        console.error('Failed to load pass:', err);
        setError(err.message || 'Failed to load ticket pass');
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [ticketCode]);

  const copyCode = () => {
    if (!ticketData?.ticket?.ticket_code) return;
    navigator.clipboard.writeText(ticketData.ticket.ticket_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center', padding: '40px' }}>
        <div className="shimmer" style={{ width: '100%', height: '480px', borderRadius: '24px' }} />
        <p style={{ marginTop: '20px', color: '#94a3b8' }}>Verifying cryptographic pass credentials...</p>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div style={{ maxWidth: '540px', margin: '60px auto', textAlign: 'center', padding: '32px' }}>
        <div className="glass-panel" style={{ padding: '40px 24px', borderRadius: '20px' }}>
          <XCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Pass Not Found</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
            {error || 'Unable to locate a valid ticket pass with this code.'}
          </p>
          <button className="btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Events
          </button>
        </div>
      </div>
    );
  }

  const { ticket, event } = ticketData;
  const isCheckedIn = ticket.status === 'CHECKED_IN';
  const isRevoked = ticket.status === 'REVOKED';
  const isCancelledOrRefunded = ticket.status === 'CANCELLED_REFUNDED' || ticket.status === 'CANCELLED' || event.status === 'CANCELLED';
  const isPast = event?.start_date ? Math.max(event.end_date ? new Date(event.end_date).getTime() : 0, new Date(event.start_date).getTime()) < Date.now() : false;
  const passCurrency = ticket?.currency || event?.currency || 'INR';

  const formattedDate = new Date(event.start_date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="page-container" style={{ maxWidth: '780px' }}>
      {/* Top Bar Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button className="btn-secondary" onClick={onBack} style={{ padding: '8px 14px', fontSize: '13px' }}>
          <ArrowLeft size={15} /> All Events
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!isCancelledOrRefunded && !isCheckedIn && !isRevoked && !isPast && (
            <button
              className="btn-secondary"
              onClick={() => setShowCancelModal(true)}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                color: '#fca5a5',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
              }}
              title="Cancel pass and claim percentage refund"
            >
              <XCircle size={15} color="#ef4444" /> Cancel Pass & Refund
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={() => downloadCalendarEvent(event, ticket)}
            style={{ padding: '8px 14px', fontSize: '13px' }}
            title="Download .ics file for Apple/Google Calendar"
          >
            <Calendar size={15} /> Add to Calendar
          </button>

          <button
            className="btn-secondary"
            onClick={() => window.print()}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <Printer size={15} /> Print Pass
          </button>

          <button
            className="btn-primary"
            onClick={() => onOpenScanner(ticket.ticket_code)}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <QrCode size={15} /> Test Scan
          </button>
        </div>
      </div>

      {/* Holographic Boarding Pass */}
      <div className="ticket-pass-card animate-fade-up" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden' }}>
        {/* Notches & Perforation Line */}
        <div className="ticket-notch-left" style={{ background: '#f8fafc' }} />
        <div className="ticket-notch-right" style={{ background: '#f8fafc' }} />
        <div className="ticket-perforation" style={{ borderColor: '#cbd5e1' }} />

        {/* Pass Header */}
        <div style={{
          padding: '24px 28px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge-vip" style={{ fontSize: '10px' }}>{ticket.tier_name}</span>
              <span style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {event.category}
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', lineHeight: '1.2', margin: 0 }}>
              {event.title}
            </h1>
          </div>

          {/* Status Badge */}
          <div>
            {isCancelledOrRefunded ? (
              <span className="badge-status-revoked" style={{ padding: '6px 14px', fontSize: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
                <XCircle size={14} color="#dc2626" /> CANCELLED & REFUNDED
              </span>
            ) : isCheckedIn ? (
              <span className="badge-status-checked" style={{ padding: '6px 14px', fontSize: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
                <CheckCircle2 size={14} color="#15803d" /> ADMITTED / CHECKED IN
              </span>
            ) : isRevoked ? (
              <span className="badge-status-revoked" style={{ padding: '6px 14px', fontSize: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
                <XCircle size={14} color="#dc2626" /> REVOKED
              </span>
            ) : isPast ? (
              <span className="badge-status-revoked" style={{ padding: '6px 14px', fontSize: '12px', background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309' }}>
                <Clock size={14} color="#b45309" /> EVENT CONCLUDED
              </span>
            ) : (
              <span className="badge-status-valid" style={{ padding: '6px 14px', fontSize: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
                <ShieldCheck size={14} color="#15803d" /> VALID FOR ADMISSION
              </span>
            )}
          </div>
        </div>

        {/* Past Event Notice Banner if Concluded & Not Checked In */}
        {isPast && !isCancelledOrRefunded && !isCheckedIn && (
          <div style={{
            background: '#fffbeb',
            borderBottom: '1px solid #fef3c7',
            padding: '14px 28px',
            color: '#92400e',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <Clock size={20} color="#b45309" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#78350f', display: 'block', fontSize: '13px', marginBottom: '2px' }}>
                Event Concluded
              </strong>
              <span>
                This event concluded on {formattedDate}. This pass was not scanned or checked in at the door.
              </span>
            </div>
          </div>
        )}

        {/* Cancellation & Refund Notice Banner */}
        {isCancelledOrRefunded && (
          <div style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            padding: '16px 28px',
            color: '#991b1b',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <AlertTriangle size={22} color="#dc2626" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#b91c1c', display: 'block', fontSize: '14px', marginBottom: '2px' }}>
                {event.status === 'CANCELLED' 
                  ? 'Event Cancelled by Organizer — 100% Student Refund Issued' 
                  : `Pass Cancelled — ${ticket.refund_percentage != null ? `${ticket.refund_percentage}% Pass Refund Processed` : 'Seat Released'}`}
              </strong>
              {Number(ticket.refund_amount) > 0 ? (
                <span>
                  A net refund of <strong>{formatCurrency(ticket.refund_amount, passCurrency)}</strong> ({ticket.refund_percentage}% of original {formatCurrency(ticket.payment_amount, passCurrency)}) was processed back to your original payment method. 
                  {ticket.cancellation_fee > 0 && ` (Cancellation Fee: ${formatCurrency(ticket.cancellation_fee, passCurrency)})`}
                  {ticket.refund_transaction_id && ` • Refund Ref: ${ticket.refund_transaction_id}`}
                </span>
              ) : Number(ticket.payment_amount) > 0 ? (
                <span>
                  This ticket was cancelled within the non-refundable window (0% refund). 
                  {ticket.refund_transaction_id && ` • Ref: ${ticket.refund_transaction_id}`}
                </span>
              ) : (
                <span>This free student admission pass has been cancelled and Seat {ticket.seat_number || 'General Entry'} has been released.</span>
              )}
              {(ticket.cancellation_reason || event.cancellation_reason) && (
                <span style={{ display: 'block', marginTop: '4px', color: '#b91c1c' }}>
                  Note: <em>{ticket.cancellation_reason || event.cancellation_reason}</em>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pass Details Grid */}
        <div style={{ padding: '28px 28px 32px', background: '#ffffff' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            marginBottom: '24px',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Attendee
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {ticket.attendee_name}
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                {ticket.attendee_email}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Assigned Seat
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                💺 Seat {ticket.seat_number || 'General Entry'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Pass Tier: {ticket.tier_name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Payment & Billing
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: ticket.payment_status === 'REFUNDED' ? '#dc2626' : (ticket.payment_amount > 0 ? '#0f172a' : '#15803d') }}>
                {ticket.payment_status === 'REFUNDED' ? (
                  `🔄 100% Refunded (${formatCurrency(ticket.refund_amount || ticket.payment_amount, passCurrency)})`
                ) : ticket.payment_amount > 0 ? (
                  `💳 Paid ${formatCurrency(ticket.payment_amount, passCurrency)} (${ticket.payment_method || 'CARD'})`
                ) : (
                  '🎓 Free Student Pass'
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                {ticket.payment_status === 'REFUNDED' ? `Ref: ${ticket.refund_transaction_id || 'PROCESSED'}` : (ticket.transaction_id || 'FREE_AUTH')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Date & Time
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                <Calendar size={15} color="#0f172a" />
                {formattedDate}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Venue Location
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                <MapPin size={15} color="#0f172a" />
                {event.venue_name}, {event.location}
              </div>
            </div>
          </div>

          {/* Check-In Audit Notice if checked in */}
          {isCheckedIn && (
            <div style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#15803d',
            }}>
              <div>
                Checked in at <strong>{new Date(ticket.checked_in_at).toLocaleTimeString()}</strong> at <strong>{ticket.check_in_door || 'Entrance'}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#166534' }}>
                Verified by: {ticket.checked_in_by || 'Entrance Volunteer'}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Perforated Stub / QR Code Area */}
        <div style={{
          padding: '28px 28px',
          background: '#f8fafc',
          borderTop: '1px dashed #cbd5e1',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}>
          {/* QR Code */}
          <div style={{
            background: '#ffffff',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
            display: 'inline-block',
          }}>
            {ticket.qrDataUrl ? (
              <img
                src={ticket.qrDataUrl}
                alt="Ticket QR Code"
                style={{ width: '150px', height: '150px', display: 'block' }}
              />
            ) : (
              <div style={{ width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={100} color="#0f172a" />
              </div>
            )}
          </div>

          {/* Verification Metadata & Code */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              Cryptographic Ticket ID
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: '800',
                letterSpacing: '0.06em',
                color: '#0f172a',
              }}>
                {ticket.ticket_code}
              </span>
              <button
                onClick={copyCode}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                {copied ? <Check size={13} color="#15803d" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div style={{
              fontSize: '12px',
              color: '#475569',
              lineHeight: '1.5',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: '700', marginBottom: '4px' }}>
                <ShieldCheck size={14} /> HMAC-SHA256 Cryptographically Signed
              </div>
              <div>Single-use entrance pass. Show this QR code to the door volunteer camera at the venue entrance.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Cancellation & Percentage Refund Modal */}
      {showCancelModal && (
        <TicketCancellationModal
          ticket={ticket}
          event={event}
          currency={passCurrency}
          onClose={() => setShowCancelModal(false)}
          onCancelled={(result) => {
            setShowCancelModal(false);
            setTicketData((prev) => ({
              ...prev,
              ticket: {
                ...prev.ticket,
                status: 'CANCELLED_REFUNDED',
                payment_status: result.quote?.refundAmount > 0 ? 'REFUNDED' : 'FREE_CANCELLED',
                refund_amount: result.quote?.refundAmount || 0,
                cancellation_fee: result.quote?.cancellationFee || 0,
                refund_percentage: result.quote?.refundPercentage ?? 100,
                refund_transaction_id: result.refundTransactionId,
                cancellation_reason: result.reason || 'Attendee self-cancellation',
              },
            }));
          }}
        />
      )}
    </div>
  );
}
