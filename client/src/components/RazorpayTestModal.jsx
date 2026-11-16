import React, { useState } from 'react';
import { 
  X, ShieldCheck, Smartphone, CreditCard, Building, CheckCircle2, 
  AlertCircle, Loader2, Sparkles, Key, Lock, ArrowRight 
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export default function RazorpayTestModal({ 
  orderData, 
  event, 
  tier, 
  seat, 
  attendee, 
  currency = 'USD',
  onSuccess, 
  onFailure, 
  onClose 
}) {
  const [activeTab, setActiveTab] = useState('upi'); // 'upi' | 'card' | 'netbanking' | 'keys'
  const [processing, setProcessing] = useState(false);
  const [upiId, setUpiId] = useState('success@razorpay');
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [customKeyId, setCustomKeyId] = useState('');
  const [customKeySecret, setCustomKeySecret] = useState('');
  const [keySavedMsg, setKeySavedMsg] = useState(null);

  const eventCurrency = event?.currency || 'INR';
  const tierPrice = Number(tier?.price || 0);

  // If the event currency chosen by the organizer is already INR, use the exact nominal price.
  // Otherwise convert to INR for the Indian Razorpay gateway simulator.
  const amountINR = orderData?.inr_amount || (
    eventCurrency === 'INR'
      ? tierPrice
      : Math.round(tierPrice * (eventCurrency === 'EUR' ? 92 : (eventCurrency === 'GBP' ? 108 : 85)))
  );
  const amountUSD = orderData?.usd_amount || tierPrice;

  const handleSimulateSuccess = (method = 'UPI') => {
    setProcessing(true);
    setTimeout(() => {
      const paymentId = `pay_rzp_${Math.floor(100000000 + Math.random() * 900000000)}`;
      onSuccess({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderData?.order_id || `order_${Date.now()}`,
        method,
      });
    }, 1200);
  };

  const handleSimulateFailure = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onFailure('Payment was declined by issuing bank or cancelled in simulation.');
    }, 800);
  };

  const handleSaveCustomKeys = async (e) => {
    e.preventDefault();
    if (!customKeyId.trim() || !customKeySecret.trim()) return;

    try {
      const res = await fetch('/api/payments/razorpay/set-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: customKeyId.trim(),
          key_secret: customKeySecret.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKeySavedMsg('Real keys saved! Future checkouts will route through your official Razorpay dashboard.');
      }
    } catch (err) {
      console.error('Failed to save keys:', err);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => { if (!processing) onClose(); }}>
      <div 
        className="modal-content animate-fade-up" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          maxHeight: '90dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: 0,
          borderRadius: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.15)',
        }}
      >
        {/* Razorpay Authentic Blue Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #1e3a8a 100%)',
          padding: '22px 24px',
          color: '#ffffff',
          position: 'relative',
        }}>
          <button
            onClick={() => { if (!processing) onClose(); }}
            disabled={processing}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: '#ffffff',
              cursor: processing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}>
              {/* Razorpay Brand Shield Icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 6V12C3 17.5 7 21.6 12 23C17 21.6 21 17.5 21 12V6L12 2Z" fill="#0284c7" />
                <path d="M10 8L15 12L10 16V8Z" fill="#ffffff" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '-0.02em' }}>Razorpay</span>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: '800',
                  letterSpacing: '0.04em',
                }}>
                  TEST MODE ($0 REAL MONEY)
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#e0f2fe' }}>
                {event?.title} • {tier?.name}
              </div>
            </div>
          </div>

          {/* Amount Due Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(8px)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginTop: '12px',
          }}>
            <div style={{ fontSize: '12px', color: '#e0f2fe' }}>
              Seat <strong>{seat}</strong> for {attendee?.name}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff' }}>
                ₹{amountINR.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '10px', color: '#bae6fd' }}>
                {eventCurrency === 'INR' ? 'Event Billing Currency (INR)' : `Original: ${formatCurrency(tierPrice, eventCurrency)}`}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              borderBottom: activeTab === 'upi' ? '2px solid #0f172a' : '2px solid transparent',
              background: activeTab === 'upi' ? '#ffffff' : 'transparent',
              color: activeTab === 'upi' ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Smartphone size={14} />
            UPI / QR
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('card')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              borderBottom: activeTab === 'card' ? '2px solid #0f172a' : '2px solid transparent',
              background: activeTab === 'card' ? '#ffffff' : 'transparent',
              color: activeTab === 'card' ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CreditCard size={14} />
            Cards
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('netbanking')}
            style={{
              flex: 1,
              padding: '12px 6px',
              border: 'none',
              borderBottom: activeTab === 'netbanking' ? '2px solid #0f172a' : '2px solid transparent',
              background: activeTab === 'netbanking' ? '#ffffff' : 'transparent',
              color: activeTab === 'netbanking' ? '#0f172a' : '#64748b',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Building size={14} />
            NetBanking
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('keys')}
            style={{
              padding: '12px 14px',
              border: 'none',
              borderBottom: activeTab === 'keys' ? '2px solid #0f172a' : '2px solid transparent',
              background: activeTab === 'keys' ? '#ffffff' : 'transparent',
              color: activeTab === 'keys' ? '#0f172a' : '#64748b',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
            title="Configure real Razorpay Merchant API keys"
          >
            <Key size={13} />
            Keys
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '24px 22px', background: '#ffffff' }}>
          {processing ? (
            <div style={{ textAlign: 'center', padding: '36px 12px' }}>
              <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 16px' }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#0f172a',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '10px auto',
                }}>
                  <Lock size={18} color="#0f172a" />
                </div>
              </div>

              <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                Authorizing Razorpay Gateway...
              </h4>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Simulating secure bank OTP authorization for ₹{amountINR.toLocaleString('en-IN')}
              </p>
            </div>
          ) : activeTab === 'upi' ? (
            /* UPI TAB */
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
                Select Test UPI App:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {[
                  { id: 'gpay', name: 'Google Pay', icon: '🟢' },
                  { id: 'phonepe', name: 'PhonePe', icon: '🟣' },
                  { id: 'paytm', name: 'Paytm', icon: '🔵' },
                  { id: 'bhim', name: 'BHIM UPI', icon: '🟠' },
                ].map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedUpiApp(app.id)}
                    style={{
                      padding: '12px 6px',
                      borderRadius: '10px',
                      background: selectedUpiApp === app.id ? '#f8fafc' : '#ffffff',
                      border: selectedUpiApp === app.id ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                      color: selectedUpiApp === app.id ? '#0f172a' : '#64748b',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>{app.icon}</div>
                    <div>{app.name}</div>
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Or enter Virtual Payment Address (VPA):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="username@bank"
                    className="input-field"
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setUpiId('success@razorpay')}
                    className="btn-secondary"
                    style={{
                      padding: '8px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                    }}
                  >
                    Auto-Fill
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={() => handleSimulateSuccess('UPI')}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <Sparkles size={16} />
                Simulate Successful UPI Payment (₹{amountINR.toLocaleString('en-IN')})
              </button>

              <button
                type="button"
                onClick={handleSimulateFailure}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: 'transparent',
                  color: '#dc2626',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Simulate Payment Decline / Failure
              </button>
            </div>
          ) : activeTab === 'card' ? (
            /* CARDS TAB */
            <div>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px',
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Card Number</label>
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    letterSpacing: '1px',
                  }}>
                    4111 •••• •••• 1111 (Razorpay Test Visa)
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Expiry</label>
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}>
                      12 / 28
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>CVV</label>
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}>
                      ••• (123)
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSimulateSuccess('CARD')}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <Sparkles size={16} />
                Pay ₹{amountINR.toLocaleString('en-IN')} via Test Card
              </button>

              <button
                type="button"
                onClick={handleSimulateFailure}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: 'transparent',
                  color: '#dc2626',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Simulate Card Declined
              </button>
            </div>
          ) : activeTab === 'netbanking' ? (
            /* NETBANKING TAB */
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
                Select Popular Bank:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '18px' }}>
                {['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Other'].map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    style={{
                      padding: '12px 6px',
                      borderRadius: '8px',
                      background: selectedBank === bank ? '#f8fafc' : '#ffffff',
                      border: selectedBank === bank ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                      color: selectedBank === bank ? '#0f172a' : '#64748b',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    🏦 {bank}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleSimulateSuccess(`NETBANKING_${selectedBank}`)}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={16} />
                Authorize via {selectedBank} NetBanking (₹{amountINR.toLocaleString('en-IN')})
              </button>
            </div>
          ) : (
            /* KEYS CONFIG TAB */
            <form onSubmit={handleSaveCustomKeys}>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', marginBottom: '14px' }}>
                Connect your personal Razorpay test merchant account from <a href="https://dashboard.razorpay.com" target="_blank" rel="noreferrer" style={{ color: '#0f172a', fontWeight: '700' }}>dashboard.razorpay.com</a>.
              </div>

              {keySavedMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '12px', marginBottom: '14px' }}>
                  ✓ {keySavedMsg}
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Razorpay Key ID</label>
                <input
                  type="text"
                  placeholder="rzp_test_..."
                  value={customKeyId}
                  onChange={(e) => setCustomKeyId(e.target.value)}
                  className="input-field"
                  style={{
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Razorpay Key Secret</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={customKeySecret}
                  onChange={(e) => setCustomKeySecret(e.target.value)}
                  className="input-field"
                  style={{
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '13px' }}
              >
                Save & Connect Real Razorpay Keys
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#64748b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#15803d" />
            <span>256-bit SSL Encrypted Sandbox Gateway</span>
          </div>
          <div>Secured by Razorpay</div>
        </div>
      </div>
    </div>
  );
}

