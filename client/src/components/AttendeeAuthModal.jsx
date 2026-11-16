import React, { useState } from 'react';
import { 
  User, Mail, Phone, Building2, X, CheckCircle2, 
  ArrowRight, Ticket, Sparkles, Loader2, LogOut, ShieldCheck,
  Lock, Eye, EyeOff, UserPlus, LogIn, AlertCircle, Calendar, MapPin,
  KeyRound, ArrowLeft
} from 'lucide-react';

export default function AttendeeAuthModal({ 
  pendingEvent, 
  currentAttendee, 
  onClose, 
  onSuccess, 
  onLogout 
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState(currentAttendee?.email || '');
  const [loginPassword, setLoginPassword] = useState('');

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [debugOtpCode, setDebugOtpCode] = useState(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState(null);

  // Register form state
  const [regData, setRegData] = useState({
    name: currentAttendee?.name || '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: currentAttendee?.phone || '',
    organization: currentAttendee?.organization || '',
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/attendee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.notFound) {
          setError(
            <span>
              No account found with <strong>{loginEmail}</strong> in our database.{' '}
              <button 
                type="button" 
                onClick={() => {
                  setRegData(prev => ({ ...prev, email: loginEmail }));
                  setMode('register');
                  setError(null);
                }}
                style={{ color: '#34d399', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Create an account now →
              </button>
            </span>
          );
        } else {
          setError(data.error || 'Login failed. Please check your credentials.');
        }
        return;
      }

      onSuccess(data.attendee);
      onClose();
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regData.name.trim() || regData.name.trim().length < 2) {
      setError('Full name is required (at least 2 characters).');
      return;
    }
    if (!regData.email.trim() || !regData.email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!regData.password || regData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (regData.password !== regData.confirmPassword) {
      setError('Passwords do not match. Please re-type your password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/attendee/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regData.name.trim(),
          email: regData.email.trim().toLowerCase(),
          password: regData.password,
          phone: regData.phone.trim(),
          organization: regData.organization.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create account.');
        return;
      }

      onSuccess(data.attendee);
      onClose();
    } catch (err) {
      console.error('Registration error:', err);
      setError('Unable to connect to authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    const target = resetEmail.trim() || loginEmail.trim();
    if (!target || !target.includes('@')) {
      setError('Please enter a valid attendee email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/attendee/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }
      setResetEmail(target.toLowerCase());
      setSuccessMsg(data.message || 'Verification code sent to your email!');
      if (data.debugCode) setDebugOtpCode(data.debugCode);
      if (data.previewUrl) setEmailPreviewUrl(data.previewUrl);
      setMode('reset');
    } catch (err) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetOtp.trim() || resetOtp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/attendee/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim().toLowerCase(),
          otpCode: resetOtp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password.');
      }
      onSuccess(data.attendee);
      onClose();
    } catch (err) {
      setError(err.message || 'Error updating password.');
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
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          maxHeight: '90dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          borderRadius: '22px',
          padding: '0',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          position: 'relative',
        }}>
          <button 
            type="button"
            onClick={onClose} 
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              background: '#f1f5f9', 
              border: '1px solid #e2e8f0', 
              color: '#64748b', 
              cursor: 'pointer',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            fontSize: '11px',
            fontWeight: '800',
            marginBottom: '10px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            <ShieldCheck size={12} color="#0f172a" />
            ATTENDEE AUTHENTICATION GATE
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            {mode === 'forgot'
              ? 'Recover Attendee Password'
              : mode === 'reset'
              ? 'Enter Verification Code'
              : pendingEvent 
              ? 'Sign In to Register for Event' 
              : mode === 'login' ? 'Attendee Sign In' : 'Create Attendee Account'}
          </h2>

          <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
            {mode === 'forgot'
              ? 'Enter your registered email address to receive a 6-digit recovery code.'
              : mode === 'reset'
              ? 'Enter the 6-digit code sent to your email to set a new password.'
              : pendingEvent 
              ? `You must be registered in our database to reserve a seat and issue a cryptographic pass.`
              : `Access your verified cryptographic passes, reserved seats, and personalized catalog.`}
          </p>
        </div>

        {/* Pending Event Alert Callout if user was trying to register */}
        {pendingEvent && (mode === 'login' || mode === 'register') && (
          <div style={{
            padding: '12px 24px',
            background: '#f0fdf4',
            borderBottom: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Ticket size={18} color="#059669" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10.5px', color: '#166534', fontWeight: '800', textTransform: 'uppercase' }}>
                TARGET REGISTRATION:
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pendingEvent.title}
              </div>
            </div>
          </div>
        )}

        {/* Auth Mode Toggle Tabs (Sign In vs Create Account) or Back to Sign In */}
        {mode === 'forgot' || mode === 'reset' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            margin: '18px 28px 0',
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
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              {mode === 'forgot' ? 'Step 1: Request Code' : 'Step 2: Reset Password'}
            </span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            padding: '4px',
            margin: '18px 28px 0',
            background: '#f1f5f9',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
              style={{
                padding: '9px',
                borderRadius: '9px',
                border: mode === 'login' ? '1px solid #e2e8f0' : '1px solid transparent',
                background: mode === 'login' ? '#0f172a' : 'transparent',
                color: mode === 'login' ? '#ffffff' : '#475569',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <LogIn size={14} />
              Sign In
            </button>

            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
              style={{
                padding: '9px',
                borderRadius: '9px',
                border: mode === 'register' ? '1px solid #e2e8f0' : '1px solid transparent',
                background: mode === 'register' ? '#0f172a' : 'transparent',
                color: mode === 'register' ? '#ffffff' : '#475569',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <UserPlus size={14} />
              Create Account
            </button>
          </div>
        )}

        {/* Active Attendee Session Bar if signed in as someone else */}
        {currentAttendee && (
          <div style={{
            margin: '12px 28px 0',
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
          }}>
            <div>
              <span style={{ color: '#64748b' }}>Currently signed in: </span>
              <strong style={{ color: '#0f172a' }}>{currentAttendee.name || currentAttendee.email}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '10.5px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Success Notice */}
        {successMsg && (
          <div style={{
            margin: '16px 28px 0',
            padding: '10px 14px',
            borderRadius: '10px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            lineHeight: '1.4',
          }}>
            <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div style={{
            margin: '16px 28px 0',
            padding: '10px 14px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            lineHeight: '1.4',
          }}>
            <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{error}</div>
          </div>
        )}

        {/* Tab 1: LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ padding: '20px 28px 28px' }}>
            {/* Email Address */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your account password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '11px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Default password: <code>Pass123!</code>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(loginEmail || '');
                    setMode('forgot');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f172a',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                style={{ flex: 1, padding: '11px', fontSize: '13px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '11px 16px',
                  fontSize: '13px',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Checking Database...
                  </>
                ) : (
                  <>
                    <LogIn size={14} />
                    {pendingEvent ? 'Verify & Continue Registration' : 'Sign In to My Account'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} style={{ padding: '20px 28px 28px' }}>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#475569', marginBottom: '18px' }}>
              Enter your registered attendee email. We will dispatch a secure 6-digit verification code to reset your account password.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                Attendee Account Email *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  required
                  placeholder="e.g. prakash33841@gmail.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setMode('login'); setError(null); }}
                style={{ flex: 1, padding: '11px', fontSize: '13px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '11px 16px',
                  fontSize: '13px',
                }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Send 6-Digit Code
              </button>
            </div>
          </form>
        )}

        {/* Tab: RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} style={{ padding: '20px 28px 28px' }}>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#475569', marginBottom: '16px' }}>
              Enter the 6-digit verification code sent to <strong>{resetEmail}</strong> and set your new password.
            </p>

            {/* Quick Demo Helper */}
            {debugOtpCode && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>🔑 Verification Code: <strong>{debugOtpCode}</strong></span>
                <button
                  type="button"
                  onClick={() => setResetOtp(debugOtpCode)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Auto-Fill
                </button>
              </div>
            )}

            {/* 6-Digit OTP */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                6-Digit Verification Code *
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '18px',
                    fontWeight: '800',
                    letterSpacing: '6px',
                    textAlign: 'center',
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* New Password & Confirm Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                  New Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min 6 chars"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                  Confirm *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Repeat"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setMode('login'); setError(null); }}
                style={{ flex: 1, padding: '11px', fontSize: '13px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '11px 16px',
                  fontSize: '13px',
                }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Update & Sign In
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: CREATE ACCOUNT FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ padding: '20px 28px 28px' }}>
            {/* Full Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Gnana Prakash Reddy"
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 38px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 38px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={13} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 chars"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 30px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                  Confirm *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={13} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat"
                    value={regData.confirmPassword}
                    onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 30px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Phone & College Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Phone (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={13} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 30px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  College / Org (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={13} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="e.g. Saveetha Univ"
                    value={regData.organization}
                    onChange={(e) => setRegData({ ...regData, organization: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 30px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                style={{ flex: 1, padding: '11px', fontSize: '13px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '11px 16px',
                  fontSize: '13px',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    {pendingEvent ? 'Create & Proceed to Register' : 'Create Attendee Account'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
