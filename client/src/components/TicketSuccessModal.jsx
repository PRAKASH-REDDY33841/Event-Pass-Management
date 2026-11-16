import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, QrCode, ExternalLink, Mail, Copy, Check, ArrowRight } from 'lucide-react';

export default function TicketSuccessModal({ ticket, emailPreviewUrl, onClose, onOpenPass, onOpenScanner, onOpenOutbox }) {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    // Fire festive confetti cannon
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#10b981'],
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, []);

  if (!ticket) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(ticket.ticket_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content animate-fade-up" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: '100%',
          maxHeight: '90vh',
          maxHeight: '90dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          textAlign: 'center',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
        }}
      >
        {/* Header Icon */}
        <div style={{ padding: '32px 28px 20px', background: '#f8fafc' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#f0fdf4',
            border: '2px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CheckCircle2 size={36} color="#15803d" />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            You're Officially Registered!
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            A confirmation email with your cryptographically signed QR ticket was sent to <strong style={{ color: '#0f172a' }}>{ticket.attendee_email}</strong>.
          </p>
        </div>

        {/* QR Code Presentation Card */}
        <div style={{
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '24px',
        }}>
          <div style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '16px',
            display: 'inline-block',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
            marginBottom: '16px',
          }}>
            {ticket.qrDataUrl ? (
              <img
                src={ticket.qrDataUrl}
                alt="Ticket QR Code"
                style={{ width: '190px', height: '190px', display: 'block' }}
              />
            ) : (
              <div style={{ width: '190px', height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={120} color="#0f172a" />
              </div>
            )}
          </div>

          {/* Ticket Code Display */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '18px',
              fontWeight: '800',
              letterSpacing: '0.08em',
              color: '#0f172a',
            }}>
              {ticket.ticket_code}
            </span>
            <button
              onClick={copyCode}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '5px 8px',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: '600',
              }}
            >
              {copied ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Attendee: <strong style={{ color: '#0f172a' }}>{ticket.attendee_name}</strong> • <span className="badge-vip" style={{ fontSize: '10px' }}>{ticket.tier_name}</span>
          </div>

          {/* 5-Hour Automated Notification Alert */}
          <div style={{
            marginTop: '16px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#334155',
            textAlign: 'left',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⏰</span>
            <div>
              <strong style={{ color: '#0f172a' }}>5-Hour Notification Queued:</strong> An automated preparation and fast-track entrance guide will be dispatched to <strong>{ticket.attendee_email}</strong> in 5 hours.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc' }}>
          <button
            className="btn-primary"
            onClick={() => onOpenPass(ticket.ticket_code)}
            style={{ padding: '12px', fontSize: '14px' }}
          >
            <ExternalLink size={16} />
            View Luxury Boarding Pass / Wallet Card
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              className="btn-secondary"
              onClick={() => onOpenScanner(ticket.ticket_code)}
              style={{ padding: '10px', fontSize: '13px' }}
            >
              <QrCode size={15} />
              Test Entrance Scan
            </button>

            <button
              className="btn-secondary"
              onClick={() => onOpenOutbox()}
              style={{ padding: '10px', fontSize: '13px' }}
            >
              <Mail size={15} />
              Inspect Email Outbox
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '13px',
              padding: '8px',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
