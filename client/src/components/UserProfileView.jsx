import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building2, MapPin, Edit3, Save, X, 
  ShieldCheck, Ticket, CheckCircle2, Clock, Calendar, Sparkles,
  ArrowRight, ExternalLink, Copy, Check, Camera, LogOut
} from 'lucide-react';

const PRESET_AVATARS = [
  '👑', '🚀', '⚡', '💻', '🎓', '🌐', '🎯', '🔥', '🛡️', '🤖', '✨', '🎸'
];

export default function UserProfileView({ 
  attendeeUser, 
  onUpdateProfile, 
  onOpenPasses, 
  onExploreEvents, 
  onOpenLogin,
  onLogout 
}) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalPasses: 0, attendedPasses: 0, activePasses: 0, cancelledPasses: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [message, setMessage] = useState(null);

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    headline: '',
    bio: '',
    phone: '',
    organization: '',
    city: '',
    country: '',
    avatar_url: '',
  });

  const loadProfile = async (email) => {
    if (!email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/attendee/profile?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      const data = await res.json();
      if (data.success && data.attendee) {
        setProfile(data.attendee);
        if (data.stats) setStats(data.stats);
        setFormData({
          name: data.attendee.name || '',
          headline: data.attendee.headline || '',
          bio: data.attendee.bio || '',
          phone: data.attendee.phone || '',
          organization: data.attendee.organization || '',
          city: data.attendee.city || 'Bengaluru',
          country: data.attendee.country || 'India',
          avatar_url: data.attendee.avatar_url || '👑',
        });
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attendeeUser?.email) {
      loadProfile(attendeeUser.email);
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [attendeeUser?.email]);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile?.email) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/attendee/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfile(data.attendee);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated and saved successfully!' });
      if (onUpdateProfile) {
        onUpdateProfile(data.attendee);
      }
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error updating profile' });
    } finally {
      setSaving(false);
    }
  };

  if (!attendeeUser) {
    return (
      <div style={{ maxWidth: '680px', margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '50px 32px', borderRadius: '24px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <User size={32} color="#0f172a" />
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
            Attendee Profile & Vault
          </h2>

          <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', maxWidth: '440px', margin: '0 auto 24px' }}>
            Sign in or create an attendee account to manage your profile, write your bio, and access all your event passes.
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={onOpenLogin}
            style={{ padding: '12px 24px', fontSize: '14px' }}
          >
            <User size={16} />
            Sign In / Create Account
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '880px', margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div className="shimmer" style={{ height: '360px', borderRadius: '24px' }} />
        <p style={{ marginTop: '20px', color: '#64748b' }}>Loading verified profile...</p>
      </div>
    );
  }

  const activeAvatar = formData.avatar_url || profile?.avatar_url || '👑';
  const isEmojiAvatar = activeAvatar.length <= 4 && !activeAvatar.startsWith('http');

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      {/* Toast Alert */}
      {message && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#166534' : '#b91c1c',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {message.type === 'success' ? <CheckCircle2 size={16} color="#15803d" /> : <X size={16} color="#b91c1c" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Profile Card Container */}
      <div className="glass-panel-elevated animate-fade-up" style={{ borderRadius: '24px', overflow: 'hidden', background: '#ffffff', border: '1px solid #e2e8f0' }}>
        {/* Cover Banner */}
        <div style={{
          height: '160px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          position: 'relative',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.04em',
            }}>
              <ShieldCheck size={13} color="#15803d" />
              VERIFIED ATTENDEE ACCOUNT
            </span>
          </div>
        </div>

        {/* Profile Content Body */}
        <div style={{ padding: '0 32px 32px', position: 'relative' }}>
          {/* Avatar & Header Action Row */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: '-50px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            {/* Avatar Circle */}
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: '4px solid #ffffff',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '44px',
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              {isEmojiAvatar ? (
                activeAvatar
              ) : (
                <img src={activeAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>

            {/* Profile Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {!isEditing ? (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setIsEditing(true)}
                    style={{ padding: '9px 18px', fontSize: '13px' }}
                  >
                    <Edit3 size={15} />
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={onLogout}
                    style={{ padding: '9px 14px', fontSize: '13px', color: '#b91c1c', borderColor: '#fca5a5' }}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      if (profile) {
                        setFormData({
                          name: profile.name || '',
                          headline: profile.headline || '',
                          bio: profile.bio || '',
                          phone: profile.phone || '',
                          organization: profile.organization || '',
                          city: profile.city || 'Bengaluru',
                          country: profile.country || 'India',
                          avatar_url: profile.avatar_url || '👑',
                        });
                      }
                    }}
                    style={{ padding: '9px 16px', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: '9px 20px', fontSize: '13px' }}
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* VIEW MODE */}
          {!isEditing ? (
            <div>
              {/* Name & Headline */}
              <div style={{ marginBottom: '14px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '4px' }}>
                  {profile?.name || 'Verified Attendee'}
                </h1>
                <p style={{ fontSize: '15px', color: '#475569', fontWeight: '600' }}>
                  {profile?.headline || 'Tech Conference Attendee & Security Enthusiast'}
                </p>
              </div>

              {/* Bio Paragraph */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '24px',
                fontSize: '14px',
                color: profile?.bio ? '#334155' : '#64748b',
                lineHeight: '1.7',
                fontStyle: profile?.bio ? 'normal' : 'italic',
              }}>
                {profile?.bio || 'No personal bio added yet. Click "Edit Profile" above to share your background, role, or interests with organizers and fellow attendees.'}
              </div>

              {/* Contact & Meta Badges */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '28px',
                fontSize: '13px',
                color: '#475569',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <Mail size={14} color="#0f172a" />
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>{profile?.email}</span>
                </div>

                {profile?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <Phone size={14} color="#0f172a" />
                    <span>{profile.phone}</span>
                  </div>
                )}

                {profile?.organization && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <Building2 size={14} color="#0f172a" />
                    <span>{profile.organization}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <MapPin size={14} color="#0f172a" />
                  <span>{profile?.city || 'Bengaluru'}, {profile?.country || 'India'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <ShieldCheck size={14} color="#0f172a" />
                  <span>ID: <code style={{ color: '#0f172a', fontWeight: '700', fontSize: '11px' }}>{profile?.id}</code></span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(profile.id)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '1px' }}
                    title="Copy Attendee ID"
                  >
                    {copiedId ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Stats Highlights Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginBottom: '28px',
              }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px 20px',
                }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Active Registered Passes
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>
                    {stats.activePasses}
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px 20px',
                }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Total Passes On File
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>
                    {stats.totalPasses}
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px 20px',
                }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Events Attended
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>
                    {stats.attendedPasses}
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '18px 20px',
                }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Cancelled & Refunded
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>
                    {stats.cancelledPasses}
                  </div>
                </div>
              </div>

              {/* Quick Navigation Footnotes */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onOpenPasses}
                  style={{ padding: '11px 20px', fontSize: '13px' }}
                >
                  <Ticket size={15} />
                  Manage My Passes & Refunds
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onExploreEvents}
                  style={{ padding: '11px 20px', fontSize: '13px' }}
                >
                  Browse Event Catalog
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            /* EDIT PROFILE FORM MODE */
            <form onSubmit={handleSave} style={{ marginTop: '10px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                  Choose Profile Avatar Icon
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar_url: av })}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        border: formData.avatar_url === av ? '2px solid #0f172a' : '1px solid #cbd5e1',
                        background: formData.avatar_url === av ? '#ffffff' : '#f8fafc',
                        fontSize: '22px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {av}
                    </button>
                  ))}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                    Or Custom Avatar Image URL:
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or your photo URL"
                    value={formData.avatar_url.startsWith('http') ? formData.avatar_url : ''}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Basic Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Full Legal / Preferred Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gnana Prakash Reddy"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Professional Headline / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI Researcher | Tech Enthusiast"
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
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
                  />
                </div>
              </div>

              {/* Bio Field */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    Personal Bio / About Me
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {formData.bio.length} / 500 characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder="Share a short summary about your background, interests in technology, and what events you like to attend..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Organization & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Organization / University
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Saveetha University"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
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
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  />
                </div>
              </div>

              {/* City & Country */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    City / Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
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
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditing(false)}
                  style={{ padding: '11px 20px', fontSize: '13px' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ padding: '11px 24px', fontSize: '13px' }}
                >
                  <Save size={15} />
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
