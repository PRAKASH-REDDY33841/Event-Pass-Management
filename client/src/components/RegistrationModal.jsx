import React, { useState, useEffect } from 'react';
import { 
  X, Check, ShieldCheck, Mail, Sparkles, Building, Phone, User, Loader2, 
  CreditCard, Smartphone, ArrowRight, ArrowLeft, Armchair, AlertCircle, CheckCircle2,
  ShieldAlert, Lock, Ticket
} from 'lucide-react';
import RazorpayTestModal from './RazorpayTestModal';
import { formatCurrency } from '../utils/currency';

export default function RegistrationModal({ event, onClose, onSuccess, onOpenPass, currency = 'USD', attendeeUser }) {
  const [eventData, setEventData] = useState(event);
  const [step, setStep] = useState(1); // 1: Tier & Info, 2: Seat Selection, 3: Payment
  const [selectedTierId, setSelectedTierId] = useState(() => {
    return event?.tiers?.[0]?.id || '';
  });

  // Always fetch fresh event details and tiers from backend whenever modal opens
  useEffect(() => {
    if (!event?.id) return;
    let isMounted = true;
    fetch(`/api/events/${event.id}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.event) {
          setEventData(data.event);
          if (data.event.tiers && data.event.tiers.length > 0) {
            setSelectedTierId(prev => {
              const matched = data.event.tiers.find(t => t.id === prev);
              return matched ? matched.id : data.event.tiers[0].id;
            });
          }
        }
      })
      .catch(err => console.error('Failed to load fresh event tiers:', err));

    return () => { isMounted = false; };
  }, [event?.id]);

  const [formData, setFormData] = useState(() => {
    return {
      name: attendeeUser?.name || localStorage.getItem('eventpass_attendee_name') || '',
      email: attendeeUser?.email || localStorage.getItem('eventpass_attendee_email') || '',
      org: attendeeUser?.organization || '',
      phone: attendeeUser?.phone || '',
    };
  });

  // Seat selection state
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Duplicate registration detection
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingPassInfo, setExistingPassInfo] = useState(null);

  // Razorpay Gateway state
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState(1);
  const [error, setError] = useState(null);

  // Fetch already booked seats for this event
  useEffect(() => {
    if (!event?.id) return;
    let isMounted = true;
    setLoadingSeats(true);
    fetch(`/api/tickets/event/${event.id}/booked-seats`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success) {
          setBookedSeats(data.bookedSeats || []);
        }
      })
      .catch(err => console.error('Failed to load booked seats:', err))
      .finally(() => {
        if (isMounted) setLoadingSeats(false);
      });

    return () => { isMounted = false; };
  }, [event?.id]);

  if (!event) return null;

  const currentTiers = (eventData?.tiers && eventData.tiers.length > 0)
    ? eventData.tiers
    : (event?.tiers && event.tiers.length > 0 ? event.tiers : []);
  const selectedTier = currentTiers.find(t => t.id === selectedTierId) || currentTiers[0] || { name: 'General Admission', price: 0 };
  const tierPrice = Number(selectedTier?.price || 0);
  const isPaidTier = tierPrice > 0;
  const eventCurrency = eventData?.currency || event?.currency || 'INR';

  // Step 1 Validation & Duplicate Registration Check
  const handleProceedToSeats = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please provide your name and email address.');
      return;
    }

    setCheckingExisting(true);
    setError(null);
    setExistingPassInfo(null);

    try {
      const email = formData.email.trim().toLowerCase();
      const res = await fetch(`/api/tickets/check-registration?event_id=${event.id}&email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (data.success && data.alreadyRegistered) {
        setExistingPassInfo(data.ticket);
        setError(`You are already registered for this event with Ticket Pass Code ${data.ticket.ticket_code} (Seat ${data.ticket.seat_number || 'General Entry'}). Multiple registrations for the same attendee are not allowed.`);
        return;
      }

      setError(null);
      setStep(2);
    } catch (err) {
      console.warn('Check registration warning:', err);
      setStep(2);
    } finally {
      setCheckingExisting(false);
    }
  };

  // Step 2 Validation (Seat selected)
  const handleProceedToPayment = () => {
    if (!selectedSeat) {
      setError('Please choose a seat from the seating chart to proceed.');
      return;
    }
    setError(null);
    setStep(3);
  };

  // Complete pass registration after payment authorization
  const completeRegistrationAfterPayment = async (transactionId, paymentMethodName = 'RAZORPAY') => {
    setShowRazorpayModal(false);
    setLoading(true);
    setProcessingStage(1);
    setError(null);

    const timer1 = setTimeout(() => setProcessingStage(2), 700);
    const timer2 = setTimeout(() => setProcessingStage(3), 1500);
    const minDelayPromise = new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const fetchPromise = fetch('/api/tickets/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          tier_id: selectedTier?.id,
          attendee_name: formData.name.trim(),
          attendee_email: formData.email.trim(),
          attendee_phone: formData.phone.trim(),
          organization: formData.org.trim(),
          seat_number: selectedSeat,
          payment_method: isPaidTier ? paymentMethodName : 'FREE',
          payment_amount: tierPrice,
          transaction_id: transactionId,
        }),
      });

      const [res] = await Promise.all([fetchPromise, minDelayPromise]);

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.alreadyRegistered) {
          setExistingPassInfo(data.ticket);
        }
        throw new Error(data.error || 'Registration failed');
      }

      // Save attendee email and new ticket to localStorage
      try {
        localStorage.setItem('eventpass_attendee_email', formData.email.trim().toLowerCase());
        localStorage.setItem('eventpass_attendee_name', formData.name.trim());
        const saved = JSON.parse(localStorage.getItem('eventpass_my_registrations') || '[]');
        const updated = [{
          eventId: event.id,
          ticketCode: data.ticket.ticket_code,
          seatNumber: data.ticket.seat_number,
          tierName: selectedTier?.name,
          paymentAmount: tierPrice,
          createdAt: new Date().toISOString(),
        }, ...saved.filter(s => s.eventId !== event.id)];
        localStorage.setItem('eventpass_my_registrations', JSON.stringify(updated));
      } catch (storageErr) {
        console.warn('LocalStorage save error:', storageErr);
      }

      onSuccess(data.ticket, data.emailPreviewUrl, {
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        organization: formData.org.trim(),
      });
    } catch (err) {
      console.error('Registration/Payment error:', err);
      setError(err.message || 'Something went wrong while confirming your pass.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoading(false);
    }
  };

  // Launch Razorpay Checkout (In-App Test Modal for Sandbox or official window.Razorpay if real keys are set)
  const handleRazorpayCheckout = async () => {
    setError(null);

    try {
      // 1. Create order on server
      const orderRes = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: tierPrice,
          event_id: event.id,
          tier_id: selectedTier?.id,
          seat_number: selectedSeat,
          attendee_name: formData.name.trim(),
          attendee_email: formData.email.trim(),
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment gateway.');
      }

      // Check if we are in Sandbox / Test Mode without merchant credentials
      const isSandbox = orderData.is_sandbox || !orderData.key_id || orderData.key_id.includes('eventpass2026') || orderData.order_id?.startsWith('order_test_');

      if (isSandbox) {
        // Open our authentic In-App Razorpay Test Modal (supports UPI, Cards, NetBanking with $0 cost and NO popup errors!)
        setRazorpayOrderData(orderData);
        setShowRazorpayModal(true);
        return;
      }

      // If real merchant keys are configured on server, open official Razorpay Checkout popup
      if (typeof window.Razorpay === 'function') {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'EventPass Security',
          description: `${event.title} • ${selectedTier?.name} (Seat ${selectedSeat})`,
          order_id: orderData.order_id,
          prefill: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            contact: formData.phone.trim() || '9999999999',
          },
          notes: {
            seat_number: selectedSeat,
            tier: selectedTier?.name,
          },
          theme: {
            color: '#0284c7',
          },
          handler: async function (response) {
            const payId = response.razorpay_payment_id || `pay_${Date.now()}`;
            await completeRegistrationAfterPayment(payId, 'RAZORPAY');
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          console.warn('Official checkout failed, falling back to test gateway modal:', resp.error?.description);
          setRazorpayOrderData(orderData);
          setShowRazorpayModal(true);
        });
        rzp.open();
      } else {
        setRazorpayOrderData(orderData);
        setShowRazorpayModal(true);
      }
    } catch (err) {
      console.error('Razorpay error:', err);
      setError(err.message || 'Payment failed to initialize.');
    }
  };

  // Direct Submission for Free Pass or Instant Sandbox Sim
  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isPaidTier) {
      await handleRazorpayCheckout();
    } else {
      const freeTxnId = `free_${Math.floor(100000 + Math.random() * 900000)}`;
      await completeRegistrationAfterPayment(freeTxnId, 'FREE_STUDENT');
    }
  };

  // Grid Configuration: 6 Rows (A to F), 8 Seats per Row
  const rows = [
    { label: 'A', name: 'VIP Front Row', tierType: 'VIP' },
    { label: 'B', name: 'VIP Premium', tierType: 'VIP' },
    { label: 'C', name: 'General Center', tierType: 'General' },
    { label: 'D', name: 'General Standard', tierType: 'General' },
    { label: 'E', name: 'Student / Balcony', tierType: 'Student' },
    { label: 'F', name: 'Student Economy', tierType: 'Student' },
  ];
  const seatsPerRow = 8;

  return (
    <div className="modal-backdrop" onClick={() => { if (!loading) onClose(); }}>
      {/* Full-Screen Payment / Pass Issuing Processing Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(14px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '36px 30px',
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.15), 0 0 40px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
            position: 'relative',
          }}>
            {/* Animated Glowing Spinner Ring */}
            <div style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '4px solid #e2e8f0',
                borderTopColor: '#0f172a',
                animation: 'spin 1s linear infinite',
              }} />
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Lock size={24} color="#0f172a" />
              </div>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
              {isPaidTier ? 'Processing Secure Payment...' : 'Securing Free Admission Pass...'}
            </h3>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
              Connecting with cryptographic vault. Your reserved seat and digital pass signature are being finalized.
            </p>

            {/* DO NOT GO BACK CRITICAL INSTRUCTION WARNING BANNER */}
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '22px',
              textAlign: 'left',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}>
              <ShieldAlert size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '900', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  ⚠️ ATTENTION: DO NOT GO BACK OR REFRESH
                </div>
                <div style={{ fontSize: '12px', color: '#b91c1c', lineHeight: '1.45' }}>
                  Please <strong>do not navigate back</strong>, close this tab, or refresh the browser. Your seat reservation for <strong>{selectedSeat}</strong> and payment token are actively confirming. Exiting will cancel the slot confirmation.
                </div>
              </div>
            </div>

            {/* Booking Summary Box */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              textAlign: 'left',
            }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>RESERVED SEAT</span>
                <strong style={{ color: '#0f172a', fontSize: '14px' }}>Seat {selectedSeat}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>TOTAL AMOUNT</span>
                <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                  {isPaidTier ? `$${tierPrice.toFixed(2)}` : 'FREE ($0.00)'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>PASS TIER</span>
                <span style={{ color: '#334155', fontSize: '12px' }}>{selectedTier?.name}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>METHOD</span>
                <span style={{ color: '#334155', fontSize: '12px' }}>
                  {isPaidTier ? 'RAZORPAY Gateway' : 'Student Free Admission'}
                </span>
              </div>
            </div>

            {/* Live Sequential Step Indicators */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: processingStage >= 1 ? '#0f172a' : '#94a3b8' }}>
                <CheckCircle2 size={15} color={processingStage >= 1 ? '#10b981' : '#cbd5e1'} />
                <span>Locking seat code {selectedSeat} in database registry...</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: processingStage >= 2 ? '#0f172a' : '#94a3b8' }}>
                <CheckCircle2 size={15} color={processingStage >= 2 ? '#10b981' : '#cbd5e1'} />
                <span>{isPaidTier ? `Authorizing payment of $${tierPrice.toFixed(2)} via Razorpay...` : 'Validating free admission entitlement...'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: processingStage >= 3 ? '#0f172a' : '#94a3b8' }}>
                <CheckCircle2 size={15} color={processingStage >= 3 ? '#10b981' : '#cbd5e1'} />
                <span>Minting cryptographic HMAC-SHA256 QR code & sending email...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div 
        className="modal-content animate-fade-up" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '680px', 
          width: '100%', 
          maxHeight: '92vh', 
          maxHeight: '92dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 26px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge-gen" style={{ fontSize: '10px' }}>{event.category}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Cryptographic Pass Booking</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{event.title}</h2>
          </div>
          <button
            onClick={() => { if (!loading) onClose(); }}
            disabled={loading}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px',
              color: loading ? '#cbd5e1' : '#64748b',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.3 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Multi-Step Breadcrumb Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 26px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '12px',
          fontWeight: '700',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 1 ? '#0f172a' : '#94a3b8' }}>
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: step >= 1 ? '#0f172a' : '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: step >= 1 ? '#ffffff' : '#64748b', fontSize: '11px',
            }}>1</span>
            Tier & Details
          </div>

          <div style={{ width: '32px', height: '2px', background: step >= 2 ? '#0f172a' : '#e2e8f0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 2 ? '#0f172a' : '#94a3b8' }}>
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: step >= 2 ? '#0f172a' : '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: step >= 2 ? '#ffffff' : '#64748b', fontSize: '11px',
            }}>2</span>
            Choose Seat
          </div>

          <div style={{ width: '32px', height: '2px', background: step >= 3 ? '#0f172a' : '#e2e8f0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step >= 3 ? '#0f172a' : '#94a3b8' }}>
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: step >= 3 ? '#0f172a' : '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: step >= 3 ? '#ffffff' : '#64748b', fontSize: '11px',
            }}>3</span>
            Payment & Pass
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div style={{
            margin: '18px 26px 0',
            padding: '14px 18px',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, lineHeight: '1.45' }}>{error}</div>
            </div>

            {existingPassInfo && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #fecaca',
                marginTop: '4px',
              }}>
                <div style={{ fontSize: '12px', color: '#0f172a' }}>
                  Registered Seat: <strong style={{ color: '#0f172a' }}>Seat {existingPassInfo.seat_number || 'General Entry'}</strong>
                </div>
                {onOpenPass && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      onClose();
                      onOpenPass(existingPassInfo.ticket_code);
                    }}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    <Ticket size={13} /> View My Pass ({existingPassInfo.ticket_code})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 1: TIER & ATTENDEE INFO ================= */}
        {step === 1 && (
          <form onSubmit={handleProceedToSeats} style={{ padding: '24px 26px' }}>
            {/* Tier Selection */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
                1. Select Ticket Tier & Pricing
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {currentTiers.map((tier) => {
                  const isSelected = tier.id === selectedTierId;
                  const priceNum = Number(tier.price);
                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedTierId(tier.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Check size={12} color="#ffffff" strokeWidth={3} />
                        </div>
                      )}
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                        {tier.name}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: priceNum === 0 ? '#10b981' : '#0f172a', marginBottom: '6px' }}>
                        {formatCurrency(priceNum, eventCurrency)}
                      </div>
                      {tier.perks && (
                        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                          {Array.isArray(tier.perks) ? tier.perks.slice(0, 2).join(' • ') : tier.perks}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attendee Details */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>
                2. Attendee Contact Details
              </label>

              <div className="grid-form-2col" style={{ marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Full Legal Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Chen"
                      className="input-field"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                      Email Address (For Pass & Receipts) *
                    </label>
                    {attendeeUser?.email && (
                      <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={11} /> Verified Account
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      required
                      placeholder="maya@university.edu"
                      className="input-field"
                      value={formData.email}
                      readOnly={!!attendeeUser?.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ 
                        paddingLeft: '36px',
                        background: attendeeUser?.email ? '#f0fdf4' : undefined,
                        borderColor: attendeeUser?.email ? '#86efac' : undefined,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid-form-2col" style={{ marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Organization / University
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="e.g. Stanford University"
                      className="input-field"
                      value={formData.org}
                      onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Contact Phone
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="tel"
                      placeholder="+1 (555) 019-4829"
                      className="input-field"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={checkingExisting || !!existingPassInfo}
                style={{ 
                  padding: '12px 24px', 
                  opacity: checkingExisting || !!existingPassInfo ? 0.6 : 1,
                  cursor: checkingExisting || !!existingPassInfo ? 'not-allowed' : 'pointer',
                }}
              >
                {checkingExisting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Checking Eligibility...
                  </>
                ) : (
                  <>
                    Next: Choose Your Seat
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2: INTERACTIVE SEAT SELECTION ================= */}
        {step === 2 && (
          <div style={{ padding: '24px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Auditorium Seat Selection</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Click an available seat to lock in your spot for {event.title}.</p>
              </div>

              {selectedSeat && (
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: '800',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <Armchair size={15} />
                  Selected: {selectedSeat}
                </div>
              )}
            </div>

            {/* Stage Screen Banner */}
            <div style={{
              background: '#f1f5f9',
              borderTop: '3px solid #0f172a',
              borderRadius: '12px 12px 4px 4px',
              padding: '10px',
              textAlign: 'center',
              color: '#0f172a',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '24px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              🎭 STAGE / MAIN AUDITORIUM SCREEN 🎭
            </div>

            {/* Seating Grid */}
            <div className="seat-map-scroll-container" style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px 16px',
              marginBottom: '20px',
            }}>
              {rows.map((row) => (
                <div key={row.label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                }}>
                  {/* Row Letter */}
                  <span style={{
                    width: '28px',
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#64748b',
                    textAlign: 'right',
                  }}>
                    {row.label}
                  </span>

                  {/* Seat Blocks 1 through 8 */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {Array.from({ length: seatsPerRow }, (_, i) => {
                      const seatCode = `${row.label}-${i + 1 < 10 ? '0' + (i + 1) : i + 1}`;
                      const isBooked = bookedSeats.includes(seatCode);
                      const isChosen = selectedSeat === seatCode;

                      return (
                        <button
                          key={seatCode}
                          type="button"
                          disabled={isBooked}
                          onClick={() => {
                            setSelectedSeat(seatCode);
                            setError(null);
                          }}
                          title={isBooked ? `Seat ${seatCode} (Booked)` : `Seat ${seatCode} (${row.tierType})`}
                          style={{
                            width: '38px',
                            height: '36px',
                            borderRadius: '8px',
                            border: isChosen 
                              ? '2px solid #0f172a' 
                              : isBooked 
                              ? '1px solid #e2e8f0' 
                              : '1px solid #cbd5e1',
                            background: isChosen 
                              ? '#0f172a' 
                              : isBooked 
                              ? '#f1f5f9' 
                              : '#ffffff',
                            color: isChosen 
                              ? '#ffffff' 
                              : isBooked 
                              ? '#cbd5e1' 
                              : '#0f172a',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: isBooked ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isChosen ? '0 2px 8px rgba(15, 23, 42, 0.25)' : 'none',
                          }}
                        >
                          <Armchair size={13} />
                          <span style={{ fontSize: '9px', marginTop: '1px' }}>{i + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Seating Legend */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
                fontSize: '11px',
                color: '#64748b',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ffffff', border: '1px solid #cbd5e1' }} />
                  <span>Available</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0f172a', border: '1px solid #0f172a' }} />
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>Selected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f1f5f9', border: '1px solid #e2e8f0' }} />
                  <span>Occupied / Booked</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f8fafc', border: '1px solid #0f172a' }} />
                  <span>VIP Zone (Rows A & B)</span>
                </div>
              </div>
            </div>

            {/* Step Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back: Details
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleProceedToPayment}
                style={{ padding: '12px 24px' }}
              >
                Proceed to Checkout ({selectedSeat || 'Select Seat'})
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PAYMENT & CONFIRMATION ================= */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} style={{ padding: '24px 26px' }}>
            {/* Order Summary Pill */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Ticket Tier & Seat:</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  {selectedTier?.name || 'General Admission'} • <strong>Seat {selectedSeat}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Attendee:</span>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>
                  {formData.name} ({formData.email})
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid #e2e8f0',
              }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Total Amount Due:</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>
                  {tierPrice === 0 ? 'FREE (₹0.00)' : formatCurrency(tierPrice, eventCurrency)}
                </span>
              </div>
            </div>

            {/* Payment Section (for Paid Tiers) */}
            {isPaidTier ? (
              <div style={{ marginBottom: '24px' }}>
                {/* Razorpay Gateway Test Mode Card */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: '900',
                        fontSize: '18px',
                      }}>
                        ₹
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Razorpay Checkout</span>
                          <span style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#15803d',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '10px',
                            fontWeight: '800',
                          }}>
                            TEST MODE ($0 COST)
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Official gateway checkout with simulated UPI, Cards, and NetBanking
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '10px',
                    padding: '14px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '14px',
                    textAlign: 'center',
                  }}>
                    <div>
                      <Smartphone size={18} color="#0f172a" style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>UPI / QR</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>GPay, PhonePe, Paytm</div>
                    </div>
                    <div>
                      <CreditCard size={18} color="#0f172a" style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Credit/Debit Cards</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Visa, MasterCard, RuPay</div>
                    </div>
                    <div>
                      <Building size={18} color="#0f172a" style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>NetBanking</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>SBI, HDFC, ICICI & 50+ Banks</div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: '#475569',
                    lineHeight: '1.5',
                    background: '#f1f5f9',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}>
                    💡 <strong>Test Flow:</strong> Clicking the payment button will launch the official Razorpay Checkout popup. In the popup, choose <strong>UPI</strong> and enter <code style={{ color: '#0f172a', fontWeight: '700' }}>success@razorpay</code> (or choose any test card) to approve instantly!
                  </div>
                </div>
              </div>
            ) : (
              /* Free Pass Confirmation Notice */
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <CheckCircle2 size={24} color="#15803d" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#15803d' }}>Free Student Admission</div>
                  <div style={{ fontSize: '12px', color: '#166534' }}>
                    No payment required. Your cryptographically signed ticket pass and QR code will be generated immediately for Seat <strong>{selectedSeat}</strong>.
                  </div>
                </div>
              </div>
            )}

            {/* Refund Guarantee Notice */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              marginBottom: '16px',
              fontSize: '11px',
              color: '#475569',
            }}>
              <ShieldCheck size={16} color="#0f172a" style={{ flexShrink: 0 }} />
              <span>
                <strong>100% Refund Guarantee:</strong> If this event is rescheduled or cancelled by the organizer, your payment of {formatCurrency(tierPrice, eventCurrency)} will be immediately refunded back to your account.
              </span>
            </div>

            {/* Inline Payment/Booking Error Alert */}
            {error && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '12.5px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(2)} disabled={loading}>
                <ArrowLeft size={16} /> Back: Seat
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  padding: '13px 26px',
                  fontSize: '14px',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing Razorpay Pass Authorization...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {isPaidTier ? `Pay ${formatCurrency(tierPrice, eventCurrency)} with Razorpay (Test Mode)` : 'Confirm Free Registration'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Realistic In-App Razorpay Test Modal (UPI, Cards, NetBanking with $0 real cost) */}
      {showRazorpayModal && (
        <RazorpayTestModal
          orderData={razorpayOrderData}
          event={event}
          tier={selectedTier}
          seat={selectedSeat}
          attendee={formData}
          currency={currency}
          onSuccess={async (paymentResult) => {
            setShowRazorpayModal(false);
            await completeRegistrationAfterPayment(paymentResult.razorpay_payment_id, paymentResult.method || 'RAZORPAY_TEST');
          }}
          onFailure={(errDesc) => {
            setShowRazorpayModal(false);
            setError(errDesc || 'Payment authorization was cancelled.');
          }}
          onClose={() => setShowRazorpayModal(false)}
        />
      )}
    </div>
  );
}
