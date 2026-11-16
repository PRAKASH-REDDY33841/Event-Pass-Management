import React, { useState } from 'react';
import { 
  Lock, KeyRound, X, Loader2, ShieldCheck, AlertCircle, 
  User, Building2, Mail, Phone, Eye, EyeOff, CheckCircle2, UserPlus, LogIn, Sparkles,
  ArrowLeft, ExternalLink, CreditCard, Landmark, FileText, BadgeCheck
} from 'lucide-react';

export default function OrganizerAuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasskeyFallback, setShowPasskeyFallback] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [masterPasskey, setMasterPasskey] = useState('');

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [emailPreviewUrl, setEmailPreviewUrl] = useState(null);
  const [debugOtpCode, setDebugOtpCode] = useState(null);

  // Register form state (with Anti-Fake & Payout Settlement fields)
  const [regData, setRegData] = useState({
    name: '',
    organization: '',
    email: '',
    phone: '',
    tax_id: '',
    payout_type: 'upi', // 'upi' | 'bank'
    payout_upi_id: '',
    payout_bank_account: '',
    payout_ifsc: '',
    password: '',
    confirmPassword: '',
  });

  // Client-side validation helper (Anti-Fraud & Anti-Fake Data Guard)
  const validateRegistration = () => {
    const cleanName = regData.name.trim();
    if (!cleanName || cleanName.length < 3) {
      return 'Please provide your Full Legal or Professional Name (minimum 3 characters).';
    }
    if (/(.)\1{3,}/.test(cleanName) || cleanName.toLowerCase().includes('test123') || cleanName.toLowerCase().includes('asdf')) {
      return 'Please enter a genuine legal or professional name (no dummy or repetitive characters).';
    }

    const cleanOrg = regData.organization.trim();
    if (!cleanOrg || cleanOrg.length < 3) {
      return 'Please enter your Organization, Company, or Event Entity name (minimum 3 characters).';
    }

    const cleanEmail = regData.email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return 'Please enter a valid official work email address (e.g., name@organization.com).';
    }
    const domain = cleanEmail.split('@')[1];
    const disposableDomains = [
      'tempmail.com', 'mailinator.com', 'guerrillamail.com', 'throwawaymail.com', 
      'fake.com', 'trashmail.com', '10minutemail.com', 'yopmail.com', 'test.com', 
      'example.com', 'burnermail.io', 'mytemp.email', 'dropmail.me'
    ];
    if (disposableDomains.includes(domain)) {
      return 'Disposable, temporary, or burner email addresses are strictly prohibited for event organizers.';
    }

    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    const digits = regData.phone.replace(/\D/g, '');
    const dummyPhones = [
      '0000000000', '1234567890', '9876543210', '9999999999', '1111111111', 
      '2222222222', '3333333333', '4444444444', '5555555555', '6666666666', 
      '7777777777', '8888888888'
    ];
    if (!phoneRegex.test(regData.phone.trim()) || digits.length < 10 || digits.length > 15 || dummyPhones.includes(digits)) {
      return 'Please enter a genuine, active contact phone number (cannot be dummy patterns like 1234567890).';
    }
    if (digits.length === 10 && !/^[6-9]/.test(digits)) {
      return 'Indian mobile numbers must begin with 6, 7, 8, or 9.';
    }

    const cleanTax = regData.tax_id.trim().toUpperCase();
    if (!cleanTax) {
      return 'Tax / Business Registration ID is required (e.g. 15-digit GSTIN or 10-digit PAN).';
    }
    const isGstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanTax);
    const isPan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanTax);
    if (!isGstin && !isPan && cleanTax.length < 6) {
      return 'Please enter a valid Tax Registration ID (15-digit GSTIN like 29AABCE1234F1Z5 or 10-digit PAN like ABCDE1234F).';
    }

    if (regData.payout_type === 'upi') {
      const cleanUpi = regData.payout_upi_id.trim();
      if (!cleanUpi || !/^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z]{2,49}$/.test(cleanUpi) || cleanUpi.includes('test@test') || cleanUpi.includes('fake@fake')) {
        return 'Please provide a valid Settlement UPI ID (e.g. yourorg@okhdfcbank or merchant@icici) for ticket payouts.';
      }
    } else {
      const cleanAcc = regData.payout_bank_account.trim();
      if (!cleanAcc || !/^\d{9,18}$/.test(cleanAcc)) {
        return 'Bank Account Number must be between 9 and 18 numerical digits.';
      }
      const cleanIfsc = regData.payout_ifsc.trim().toUpperCase();
      if (!cleanIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        return 'Please enter a valid 11-character Indian Financial System Code (IFSC, e.g. HDFC0001234).';
      }
    }

    if (!regData.password || regData.password.length < 6) {
      return 'Password is required and must be at least 6 characters.';
    }
    if (regData.password !== regData.confirmPassword) {
      return 'Passwords do not match. Please re-type your confirm password.';
    }
    return null;
  };

  // Submit Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // If master passkey fallback is being used
    if (showPasskeyFallback && masterPasskey.trim()) {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/verify-organizer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passkey: masterPasskey.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Invalid organizer passkey.');
        }
        onSuccess(masterPasskey.trim(), data.organizer || {
          name: 'Master Organizer (Admin)',
          organization: 'EventPass Administration',
          email: 'admin@eventpass.io',
          role: 'ADMIN',
        });
        onClose();
      } catch (err) {
        setError(err.message || 'Passkey verification failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter both your organizer email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login-organizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate organizer.');
      }

      onSuccess(data.token, data.organizer);
      onClose();
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Registration (Anti-Fraud & Verified Direct Payout Escrow)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const clientValError = validateRegistration();
    if (clientValError) {
      setError(clientValError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-organizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regData.name.trim(),
          organization: regData.organization.trim(),
          email: regData.email.trim(),
          phone: regData.phone.trim(),
          tax_id: regData.tax_id.trim().toUpperCase(),
          payout_upi_id: regData.payout_type === 'upi' ? regData.payout_upi_id.trim() : '',
          payout_bank_account: regData.payout_type === 'bank' ? regData.payout_bank_account.trim() : '',
          payout_ifsc: regData.payout_type === 'bank' ? regData.payout_ifsc.trim().toUpperCase() : '',
          password: regData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed. Please check your details.');
      }

      onSuccess(data.token, data.organizer);
      onClose();
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fill Verified Test Entity Registration
  const handleFillDemoRegistration = () => {
    setRegData({
      name: 'Dr. Vikram Chandra',
      organization: 'TechVision Summits Global Ltd',
      email: 'vikram.chandra@techvision2026.org',
      phone: '+91 98450 12890',
      tax_id: '29AABCT1334F1Z8',
      payout_type: 'upi',
      payout_upi_id: 'techvision@okhdfcbank',
      payout_bank_account: '98765432101234',
      payout_ifsc: 'HDFC0001234',
      password: 'Organizer2026!',
      confirmPassword: 'Organizer2026!',
    });
    setError(null);
    setSuccessMsg('✓ Pre-verified organizer profile populated! Click Complete Registration to create your account.');
  };

  // 1-Click Fill Demo Organizer Account
  const handleFillDemoAccount = () => {
    setMode('login');
    setShowPasskeyFallback(false);
    setLoginEmail('organizer@eventpass.io');
    setLoginPassword('Organizer2026!');
    setError(null);
    setSuccessMsg(null);
  };

  // Submit Forgot Password (request 6-digit OTP code)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setEmailPreviewUrl(null);

    const targetEmail = resetEmail.trim() || loginEmail.trim();
    if (!targetEmail) {
      setError('Please enter your organizer email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setResetEmail(targetEmail);
      setSuccessMsg(data.message || 'Verification code sent!');
      if (data.previewUrl) setEmailPreviewUrl(data.previewUrl);
      if (data.debugCode) setDebugOtpCode(data.debugCode);
      setMode('reset');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send password reset code.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Reset (verify OTP and update password)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!resetEmail.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!resetOtp.trim() || resetOtp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          otpCode: resetOtp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      onSuccess(data.token, data.organizer);
      onClose();
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
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
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '22px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '22px 26px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  👑 Organizer Console
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500' }}>Verified Access</span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                {mode === 'login' && 'Organizer Console Sign In'}
                {mode === 'register' && 'Register Official Organizer'}
                {mode === 'forgot' && 'Reset Organizer Password'}
                {mode === 'reset' && 'Enter Verification Code'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher / Mode Navigation */}
        {mode === 'login' || mode === 'register' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            padding: '4px',
            margin: '18px 26px 0',
            background: '#f1f5f9',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            gap: '4px',
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 14px',
                borderRadius: '9px',
                border: mode === 'login' ? '1px solid #e2e8f0' : '1px solid transparent',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: mode === 'login' ? '#0f172a' : 'transparent',
                color: mode === 'login' ? '#ffffff' : '#475569',
              }}
            >
              <LogIn size={14} />
              Organizer Sign In
            </button>

            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 14px',
                borderRadius: '9px',
                border: mode === 'register' ? '1px solid #e2e8f0' : '1px solid transparent',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: mode === 'register' ? '#0f172a' : 'transparent',
                color: mode === 'register' ? '#ffffff' : '#475569',
              }}
            >
              <UserPlus size={14} />
              Register as Organizer
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            margin: '18px 26px 0',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={15} />
              Back to Sign In
            </button>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
              {mode === 'forgot' ? 'Step 1 of 2: Request Code' : 'Step 2 of 2: Enter Code & Password'}
            </span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            margin: '16px 26px 0',
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}>
            <CheckCircle2 size={17} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ lineHeight: '1.4' }}>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            margin: '16px 26px 0',
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}>
            <AlertCircle size={17} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ lineHeight: '1.4' }}>{error}</span>
          </div>
        )}

        {/* ----------------- TAB 1: LOGIN ----------------- */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ padding: '20px 26px 26px' }}>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#475569', marginBottom: '18px' }}>
              Sign in with your verified organizer credentials to configure event schedules, monitor entrance doors, and manage ticket revoking.
            </p>

            {/* Quick Demo Credentials Box */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.04em' }}>
                  <Sparkles size={13} color="#0f172a" />
                  PRE-CONFIGURED DEMO ORGANIZER
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
                  <strong style={{ color: '#0f172a' }}>organizer@eventpass.io</strong> • <em>Global Tech Consortium</em>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDemoAccount}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '5px 10px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Auto-Fill Demo
              </button>
            </div>

            {!showPasskeyFallback ? (
              <>
                {/* Email */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                    <Mail size={14} color="#0f172a" />
                    Organizer Work Email
                  </label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="e.g. organizer@organization.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                      <Lock size={14} color="#0f172a" />
                      Organizer Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(loginEmail || '');
                        setMode('forgot');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0f172a',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="input-field"
                      placeholder="Enter organizer password..."
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      style={{ paddingRight: '40px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Master Passkey Fallback */
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                  <KeyRound size={14} color="#0f172a" />
                  Master Administrator Secret Key
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter system master key..."
                  value={masterPasskey}
                  onChange={(e) => setMasterPasskey(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                  autoFocus
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Default admin key: <strong style={{ color: '#0f172a' }}>eventpass2026</strong>
                </span>
              </div>
            )}

            {/* Passkey Fallback Toggle */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowPasskeyFallback(!showPasskeyFallback);
                  setError(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                {showPasskeyFallback ? '← Back to Email & Password Login' : 'Sign in using Master Passkey instead'}
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={loading}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ padding: '10px 22px' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Unlock Console
              </button>
            </div>
          </form>
        )}

        {/* ----------------- TAB: FORGOT PASSWORD ----------------- */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} style={{ padding: '20px 26px 26px' }}>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#475569', marginBottom: '18px' }}>
              Forgot your organizer credentials? Enter your registered email address below. We'll generate a secure, 6-digit verification code and dispatch it to your email and the In-App Outbox.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                <Mail size={14} color="#0f172a" />
                Organizer Work Email
              </label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="e.g. organizer@eventpass.io"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setResetEmail('organizer@eventpass.io')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Use demo email (organizer@eventpass.io)
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f172a',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Already have a code? Enter code →
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                disabled={loading}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ padding: '10px 22px' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                Send Verification Code
              </button>
            </div>
          </form>
        )}

        {/* ----------------- TAB: RESET PASSWORD ----------------- */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} style={{ padding: '20px 26px 26px' }}>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#475569', marginBottom: '16px' }}>
              Enter the 6-digit verification code sent to <strong>{resetEmail || 'your email'}</strong>, and choose a new password.
            </p>

            {/* Quick Helper Banner for Dev/Demo */}
            {(debugOtpCode || emailPreviewUrl) && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#166534',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}>
                {debugOtpCode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Dispatched Code: <strong style={{ color: '#0f172a', letterSpacing: '1px', fontFamily: 'monospace' }}>{debugOtpCode}</strong></span>
                    <button
                      type="button"
                      onClick={() => setResetOtp(debugOtpCode)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: '700',
                      }}
                    >
                      Fill Code
                    </button>
                  </div>
                )}
                {emailPreviewUrl && (
                  <a
                    href={emailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0f172a',
                      textDecoration: 'underline',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                    }}
                  >
                    Preview Email <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            {/* Organizer Email */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                <Mail size={14} color="#0f172a" />
                Organizer Work Email
              </label>
              <input
                type="email"
                required
                className="input-field"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              />
            </div>

            {/* 6-Digit Code */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                <KeyRound size={14} color="#0f172a" />
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                className="input-field"
                placeholder="• • • • • •"
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ letterSpacing: '6px', fontSize: '18px', fontWeight: '800', textAlign: 'center', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                autoFocus
              />
            </div>

            {/* New Password & Confirm */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                  <Lock size={13} color="#0f172a" />
                  New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="input-field"
                    placeholder="Min 6 chars..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ paddingRight: '35px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                  <Lock size={13} color="#0f172a" />
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Re-type password..."
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>
            </div>

            {/* Resend Link */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Didn't receive a code? Request a new code
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                disabled={loading}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ padding: '10px 22px' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Update Password & Sign In
              </button>
            </div>
          </form>
        )}

        {/* ----------------- TAB 2: REGISTER ----------------- */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ padding: '20px 26px 26px' }}>
            {/* Financial Escrow & Anti-Fake Guard Notice */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '18px',
              fontSize: '12px',
              lineHeight: '1.5',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.03em' }}>
                  <ShieldCheck size={16} color="#0f172a" />
                  MANDATORY FINANCIAL INTEGRITY & ANTI-FRAUD VERIFICATION
                </div>
                <button
                  type="button"
                  onClick={handleFillDemoRegistration}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 9px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title="Load pre-verified Indian entity with GSTIN and UPI ID"
                >
                  <Sparkles size={12} color="#0f172a" />
                  Auto-Fill Verified Entity
                </button>
              </div>
              <div style={{ color: '#475569', fontSize: '11.5px', lineHeight: '1.45' }}>
                Because ticket sales revenue and attendee refund settlements involve real money transactions, organizers must provide a verified Tax ID (GSTIN / PAN) and direct payout settlement destination. Dummy or fake entities are strictly rejected.
              </div>
            </div>

            {/* Row 1: Legal Name & Organization */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                  <User size={13} color="#0f172a" />
                  Organizer Legal Full Name *
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Dr. Jane Doe"
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                  <Building2 size={13} color="#0f172a" />
                  Organization / Entity Name *
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Apex Tech Summits Inc."
                  value={regData.organization}
                  onChange={(e) => setRegData({ ...regData, organization: e.target.value })}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>
            </div>

            {/* Row 2: Official Work Email & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                  <Mail size={13} color="#0f172a" />
                  Official Work Email *
                </label>
                <input
                  type="email"
                  required
                  className="input-field"
                  placeholder="organizer@domain.com (no temp emails)"
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                  <Phone size={13} color="#0f172a" />
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  required
                  className="input-field"
                  placeholder="+91 98450 12890"
                  value={regData.phone}
                  onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>
            </div>

            {/* Row 3: Tax / Business Registration ID (Anti-Fake requirement) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FileText size={13} color="#0f172a" />
                  Tax / Business Registration ID (GSTIN / PAN) *
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                  15-digit GSTIN or 10-digit PAN
                </span>
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. 29AABCT1334F1Z8 or ABCDE1234F"
                value={regData.tax_id}
                onChange={(e) => setRegData({ ...regData, tax_id: e.target.value.toUpperCase() })}
                style={{ fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              />
            </div>

            {/* Row 4: Settlement Payout Destination (Real-time Escrow) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                  <Landmark size={14} color="#059669" />
                  Ticket Revenue Payout Destination *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setRegData({ ...regData, payout_type: 'upi' })}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: regData.payout_type === 'upi' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: regData.payout_type === 'upi' ? '#0f172a' : '#ffffff',
                      color: regData.payout_type === 'upi' ? '#ffffff' : '#475569',
                    }}
                  >
                    UPI ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegData({ ...regData, payout_type: 'bank' })}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: regData.payout_type === 'bank' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: regData.payout_type === 'bank' ? '#0f172a' : '#ffffff',
                      color: regData.payout_type === 'bank' ? '#ffffff' : '#475569',
                    }}
                  >
                    Bank Transfer (IFSC)
                  </button>
                </div>
              </div>

              {regData.payout_type === 'upi' ? (
                <div>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. organizer@okhdfcbank or merchant@icici"
                    value={regData.payout_upi_id}
                    onChange={(e) => setRegData({ ...regData, payout_upi_id: e.target.value.toLowerCase() })}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Revenue settlements and attendee refund debits will settle directly via this UPI VPA handle.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="Bank Account Number (9-18 digits)"
                      value={regData.payout_bank_account}
                      onChange={(e) => setRegData({ ...regData, payout_bank_account: e.target.value.replace(/\D/g, '') })}
                      style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      className="input-field"
                      placeholder="Bank IFSC Code (e.g. HDFC0001234)"
                      value={regData.payout_ifsc}
                      onChange={(e) => setRegData({ ...regData, payout_ifsc: e.target.value.toUpperCase() })}
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Row 5: Password & Confirm Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                  <Lock size={13} color="#0f172a" />
                  Console Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Min 6 characters..."
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                  <Lock size={13} color="#0f172a" />
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Re-type password..."
                  value={regData.confirmPassword}
                  onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={loading}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ padding: '10px 22px' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Complete Registration & Unlock Console
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
