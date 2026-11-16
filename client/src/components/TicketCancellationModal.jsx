import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, ShieldAlert, ArrowRight, CheckCircle2, 
  Clock, DollarSign, Armchair, Loader2, Sparkles, AlertCircle 
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export default function TicketCancellationModal({ ticket, event, onClose, onCancelled, currency }) {
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [quoteData, setQuoteData] = useState(null);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState('Change of schedule / unable to attend');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const ticketId = ticket?.id || ticket?.ticket_code;
  const eventCurrency = event?.currency || ticket?.currency || quoteData?.event?.currency || currency || 'INR';

  useEffect(() => {
    if (!ticketId) return;
    setLoadingQuote(true);
    setError(null);

    fetch(`/api/tickets/${encodeURIComponent(ticketId)}/cancellation-quote`)
      .then(async (res) => {
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('Could not calculate quote. Please try again.');
        }
        if (!data.success) {
          throw new Error(data.error || 'Failed to calculate cancellation quote.');
        }
        setQuoteData(data);
      })
      .catch(err => {
        console.error('Cancellation quote error:', err);
        setError(err.message || 'Unable to calculate cancellation quote.');
      })
      .finally(() => setLoadingQuote(false));
  }, [ticketId]);

  const handleConfirmCancellation = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/cancel-by-attendee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Connection reset during cancellation. Please refresh and check your pass.');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cancellation request failed.');
      }

      setResult(data);
      if (onCancelled) {
        onCancelled(data);
      }
    } catch (err) {
      console.error('Cancellation failed:', err);
      setError(err.message || 'Failed to process pass cancellation.');
    } finally {
      setSubmitting(false);
    }
  };

  const quote = quoteData?.quote;
  const isPaid = (ticket?.payment_amount || 0) > 0;
  const hoursLeft = quote?.hoursRemaining ?? 0;
  const minutesLeft = quote?.minutesRemaining ?? Math.round(hoursLeft * 60);

  // Cancellation Policy Slabs for visual reference (tiered refund up to 5 min before start)
  const policySlabs = [
    { label: '> 48 Hours', refund: 90, fee: 10, desc: '10% Processing Fee' },
    { label: '24h – 48h', refund: 75, fee: 25, desc: '25% Cancellation Charge' },
    { label: '12h – 24h', refund: 50, fee: 50, desc: '50% Cancellation Charge' },
    { label: '2h – 12h', refund: 25, fee: 75, desc: '75% Late Cancellation Fee' },
    { label: '5 Min – 2 Hours', refund: 10, fee: 90, desc: '10% Refund (Emergency Window, open up to 5 min before start)' },
    { label: '< 5 Minutes', refund: 0, fee: 100, desc: 'Non-refundable (Gate Check-in Lockout)' },
  ];

  return (
    <div className="modal-backdrop" onClick={() => { if (!submitting) onClose(); }}>
      <div 
        className="modal-content animate-fade-up" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '600px', 
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
        {/* Header (Sticky at top during scroll) */}
        <div style={{
          padding: '16px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '800',
              }}>
                🎟️ EVENTPASS CANCELLATION POLICY
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Automated Refund Slabs</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Cancel Pass & Refund Request
            </h2>
          </div>
          <button
            onClick={() => { if (!submitting) onClose(); }}
            disabled={submitting}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px',
              color: '#64748b',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* SUCCESS VIEW: REFUND STATUS */}
          {result ? (
            <div style={{ textAlign: 'center', padding: '10px 4px' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#f0fdf4',
                border: '2px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircle2 size={40} color="#15803d" />
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: '9999px',
                background: (result.quote?.refundAmount > 0) ? '#f0fdf4' : '#f1f5f9',
                border: `1px solid ${(result.quote?.refundAmount > 0) ? '#bbf7d0' : '#e2e8f0'}`,
                color: (result.quote?.refundAmount > 0) ? '#15803d' : '#0f172a',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.04em',
                marginBottom: '12px',
                textTransform: 'uppercase',
              }}>
                <span>●</span>
                <span>{result.quote?.refundAmount > 0 ? `Refund Approved (${result.quote?.refundPercentage}% Net Credit)` : 'Pass Cancelled • Seat Released'}</span>
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
                Cancellation & Refund Status
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
                {result.message}
              </p>

              {/* Big Refund Amount Card */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                      Net Refund Credited
                    </span>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', lineHeight: '1.1', marginTop: '4px' }}>
                      {result.quote?.refundAmount > 0 
                        ? formatCurrency(result.quote?.refundAmount, eventCurrency)
                        : (eventCurrency === 'INR' ? '₹0.00' : '$0.00')}
                    </div>
                  </div>

                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    fontSize: '11px',
                    fontWeight: '800',
                  }}>
                    {result.quote?.refundPercentage ?? 100}% Refund
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  Reversed to original payment method (Test Mode Instant Simulation)
                </div>
              </div>

              {/* Breakdown Details Grid */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px 20px',
                textAlign: 'left',
                marginBottom: '24px',
                fontSize: '13px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>Event:</span>
                  <strong style={{ color: '#0f172a' }}>{event?.title || quoteData?.event?.title}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>Released Seat:</span>
                  <strong style={{ color: '#0f172a' }}>Seat {result.releasedSeat || ticket.seat_number || 'General Entry'}</strong>
                </div>

                {result.quote?.originalAmount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ color: '#64748b' }}>Original Ticket Price:</span>
                      <span style={{ color: '#0f172a', fontWeight: '700' }}>
                        {formatCurrency(result.quote?.originalAmount, eventCurrency)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ color: '#64748b' }}>Cancellation Fee ({100 - result.quote?.refundPercentage}%):</span>
                      <span style={{ color: '#dc2626', fontWeight: '700' }}>
                        -{formatCurrency(result.quote?.cancellationFee, eventCurrency)}
                      </span>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Refund Reference ID:</span>
                  <code style={{ color: '#0f172a', fontWeight: '700', fontSize: '12px' }}>
                    {result.refundTransactionId}
                  </code>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={onClose}
                style={{ width: '100%', padding: '13px', fontSize: '14px', fontWeight: '800' }}
              >
                Close & Return
              </button>
            </div>
          ) : loadingQuote ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Loader2 size={32} className="animate-spin" color="#0f172a" style={{ margin: '0 auto 14px' }} />
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                Calculating event pass cancellation refund slab based on scheduled start time...
              </p>
            </div>
          ) : error ? (
            <div style={{ padding: '16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <AlertCircle size={20} color="#dc2626" />
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <div>
              {/* Event & Pass Meta */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Event:</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{event?.title || quoteData?.event?.title}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Ticket Pass Code:</span>
                  <code style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>{ticket?.ticket_code}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Assigned Seat:</span>
                  <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>Seat {ticket?.seat_number || 'General Entry'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Time to Event:</span>
                  <span style={{ fontSize: '13px', color: minutesLeft > 1440 ? '#15803d' : minutesLeft >= 5 ? '#b45309' : '#dc2626', fontWeight: '800' }}>
                    {minutesLeft < 120 
                      ? `⏱️ ${minutesLeft} mins remaining (Cancel open up to 5m before start)` 
                      : `⏱️ ${hoursLeft} hours remaining`}
                  </span>
                </div>
              </div>

              {/* EventPass Refund Slabs Meter */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  🛡️ EventPass Cancellation & Refund Slabs:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {policySlabs.map((slab) => {
                    const isCurrentSlab = isPaid && quote?.refundPercentage === slab.refund;

                    return (
                      <div
                        key={slab.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: isCurrentSlab 
                            ? '#f1f5f9' 
                            : '#ffffff',
                          border: isCurrentSlab 
                            ? '1.5px solid #0f172a' 
                            : '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isCurrentSlab ? '#0f172a' : '#cbd5e1',
                          }} />
                          <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                            {slab.label}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            ({slab.desc})
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isCurrentSlab && (
                            <span style={{
                              background: '#0f172a',
                              color: '#ffffff',
                              fontSize: '9px',
                              fontWeight: '900',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              letterSpacing: '0.04em',
                            }}>
                              ACTIVE SLAB
                            </span>
                          )}
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '800',
                            color: slab.refund >= 75 ? '#15803d' : slab.refund >= 25 ? '#b45309' : '#dc2626',
                          }}>
                            {slab.refund}% Refund
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Exact Financial Breakdown Box */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '18px 20px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Original Ticket Price:</span>
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>
                    {isPaid ? formatCurrency(quote.originalAmount, eventCurrency) : `FREE (${eventCurrency === 'INR' ? '₹' : '$'}0.00)`}
                  </span>
                </div>

                {isPaid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Cancellation & Handling Fee ({100 - quote.refundPercentage}%):</span>
                    <span style={{ color: '#dc2626', fontWeight: '700' }}>
                      -{formatCurrency(quote.cancellationFee, eventCurrency)}
                    </span>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '10px',
                  borderTop: '1px solid #e2e8f0',
                }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'block' }}>
                      Net Refund to Your Account:
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Credited via original payment method
                    </span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
                    {isPaid ? formatCurrency(quote.refundAmount, eventCurrency) : `${eventCurrency === 'INR' ? '₹' : '$'}0.00 (Free Pass)`}
                  </span>
                </div>
              </div>

              {/* Seat Release Notice */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
                fontSize: '12px',
                color: '#334155',
              }}>
                <Armchair size={18} color="#0f172a" style={{ flexShrink: 0 }} />
                <span>
                  Confirming cancellation will release <strong>Seat {ticket?.seat_number || 'General Entry'}</strong> immediately so other students can reserve it.
                </span>
              </div>

              {/* Reason Selector */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Reason for Cancellation:
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="select-field"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="Change of schedule / unable to attend">Change of schedule / unable to attend</option>
                  <option value="Booked wrong seat or tier">Booked wrong seat or tier</option>
                  <option value="Personal emergency">Personal emergency</option>
                  <option value="Travel / commute difficulty">Travel / commute difficulty</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Actions */}
              <div className="grid-form-2col" style={{ marginTop: '16px', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                  style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Keep My Reservation
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCancellation}
                  disabled={submitting || (isPaid && !quote.canCancel)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: submitting || (isPaid && !quote.canCancel) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing Cancellation & Refund...
                    </>
                  ) : (
                    <>
                      Confirm Cancellation {isPaid && quote.refundAmount > 0 ? `(${formatCurrency(quote.refundAmount, eventCurrency)} Refund)` : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

