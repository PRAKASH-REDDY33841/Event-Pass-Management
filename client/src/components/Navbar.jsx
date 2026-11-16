import React, { useState } from 'react';
import { 
  Ticket, QrCode, LayoutDashboard, Mail, PlusCircle, 
  RefreshCw, Radio, Sparkles, MapPin, LogOut, User, 
  Menu, X, ChevronRight, ShieldCheck, CheckCircle2 
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  isConnected, 
  onOpenCreateEvent, 
  onResetSeed, 
  isOrganizer, 
  organizerUser, 
  onOpenOrganizerLogin, 
  onOrganizerLogout,
  attendeeUser,
  onOpenAttendeeLogin,
  onAttendeeLogout,
  myPassesCount = 0,
  userLocation,
  onOpenLocationSettings,
}) {
  const [resetting, setResetting] = useState(false);
  const [showOrgDetails, setShowOrgDetails] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleReset = async () => {
    if (!isOrganizer) {
      if (onOpenOrganizerLogin) onOpenOrganizerLogin();
      return;
    }
    if (!window.confirm('Reset all attendees and re-seed sample events with fresh cryptographic tickets?')) return;
    setResetting(true);
    try {
      await onResetSeed();
    } finally {
      setResetting(false);
    }
  };

  const handleCreateClick = () => {
    if (!isOrganizer) {
      if (onOpenOrganizerLogin) onOpenOrganizerLogin();
    } else {
      onOpenCreateEvent();
    }
  };

  const attendeeNavItems = [
    { id: 'intro', label: 'Overview', icon: Sparkles },
    { id: 'events', label: 'Events', icon: Ticket },
    { id: 'my-passes', label: 'My Passes', icon: Ticket, badge: myPassesCount },
    ...(attendeeUser ? [{ id: 'profile', label: 'Profile', icon: User, tooltip: 'Attendee Profile & Bio' }] : []),
  ];

  const organizerNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: 'Live Attendance & Gate Speedometer' },
    { id: 'scanner', label: 'Doorbell Scanner', icon: QrCode, tooltip: 'Gate QR & Audio Entrance Scanner' },
    { id: 'events', label: 'Events Manager', icon: Ticket, tooltip: 'Manage Events, Tiers & Schedules' },
    { id: 'outbox', label: 'Email Outbox', icon: Mail, tooltip: 'Ticket & Refund Dispatch Outbox' },
    { id: 'intro', label: 'Overview', icon: Sparkles, tooltip: 'Platform Overview' },
  ];

  const navItems = isOrganizer ? organizerNavItems : attendeeNavItems;

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        padding: '0 16px',
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '60px',
          gap: '12px',
        }}>
          {/* Left: Brand Logo */}
          <div 
            onClick={() => handleTabClick('intro')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              userSelect: 'none',
              flexShrink: 0,
            }}
            title="EventPass — Anti-Fraud Ticketing & Entrance Security Platform"
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
              flexShrink: 0,
            }}>
              <Ticket size={18} color="#ffffff" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.03em', color: '#0f172a' }}>
                Event<span style={{ color: '#2563eb' }}>Pass</span>
              </span>
              <span style={{
                fontSize: '9.5px',
                fontWeight: '800',
                padding: '2px 7px',
                borderRadius: '6px',
                background: isOrganizer ? '#f8fafc' : '#f1f5f9',
                color: isOrganizer ? '#0f172a' : '#475569',
                border: '1px solid #cbd5e1',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {isOrganizer ? '👑 Console' : 'Attendee'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs Bar */}
          <nav className="desktop-only-flex" style={{
            alignItems: 'center',
            gap: '4px',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            flexShrink: 1,
          }}>
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  title={item.tooltip || item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9px',
                    border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
                    fontSize: '12.5px',
                    fontWeight: isActive ? '700' : '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                    whiteSpace: 'nowrap',
                    lineHeight: '1',
                    height: '30px',
                  }}
                >
                  <IconComponent size={14} color={isActive ? '#0f172a' : '#64748b'} />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span style={{
                      background: isActive ? '#0f172a' : '#cbd5e1',
                      color: '#ffffff',
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: '800',
                      lineHeight: '1.2',
                      marginLeft: '2px',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Desktop Right Controls */}
          <div className="desktop-only-flex" style={{ alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Live Sync */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                padding: '0 10px',
                borderRadius: '9999px',
                background: isConnected ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${isConnected ? '#a7f3d0' : '#fecaca'}`,
                fontSize: '11px',
                fontWeight: '600',
                color: isConnected ? '#065f46' : '#991b1b',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title={isConnected ? 'WebSocket stream active' : 'Connecting to real-time sync server...'}
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isConnected ? '#10b981' : '#ef4444',
                boxShadow: isConnected ? '0 0 6px #10b981' : 'none',
                display: 'inline-block',
              }} />
              <span>{isConnected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            {isOrganizer ? (
              <>
                {/* Organizer Profile Chip */}
                <div style={{ position: 'relative' }}>
                  <div 
                    onClick={() => setShowOrgDetails(!showOrgDetails)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      height: '32px',
                      padding: '0 8px 0 6px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                    title="Verified organizer profile"
                  >
                    <span style={{ fontSize: '11px' }}>👑</span>
                    <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {organizerUser?.name || 'Organizer'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOrganizerLogout();
                      }}
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        borderRadius: '5px',
                        padding: '2px 5px',
                        fontSize: '9.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      Exit
                    </button>
                  </div>

                  {showOrgDetails && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '38px',
                        right: '0',
                        width: '300px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.14)',
                        padding: '16px',
                        zIndex: 1000,
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                        {organizerUser?.name || 'Organizer'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '12px' }}>
                        {organizerUser?.organization || 'Verified Host'} • {organizerUser?.email}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowOrgDetails(false);
                          onOrganizerLogout();
                        }}
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', color: '#b91c1c', fontSize: '11px', padding: '6px' }}
                      >
                        Exit Organizer Console
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="btn-secondary"
                  onClick={handleReset}
                  disabled={resetting}
                  style={{ height: '32px', padding: '0 10px', fontSize: '11.5px', gap: '4px' }}
                >
                  <RefreshCw size={12} className={resetting ? "animate-spin" : ""} />
                  <span>{resetting ? 'Resetting...' : 'Reset'}</span>
                </button>

                <button
                  className="btn-primary"
                  onClick={handleCreateClick}
                  style={{ height: '32px', padding: '0 12px', fontSize: '12px', gap: '5px' }}
                >
                  <PlusCircle size={13} />
                  <span>+ Event</span>
                </button>
              </>
            ) : (
              <>
                {attendeeUser ? (
                  <div 
                    onClick={() => handleTabClick('profile')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      height: '32px',
                      padding: '0 8px 0 6px',
                      borderRadius: '8px',
                      background: activeTab === 'profile' ? '#f1f5f9' : '#ffffff',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    <User size={13} color="#0f172a" />
                    <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {attendeeUser.name || attendeeUser.email.split('@')[0]}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAttendeeLogin();
                      }}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        fontSize: '9px',
                        cursor: 'pointer',
                      }}
                    >
                      Switch
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={onOpenAttendeeLogin}
                    style={{ height: '32px', padding: '0 12px', fontSize: '11.5px', gap: '5px' }}
                  >
                    <User size={12} />
                    <span>Sign In</span>
                  </button>
                )}

                <button
                  className="btn-secondary"
                  onClick={onOpenOrganizerLogin}
                  style={{ height: '32px', padding: '0 10px', fontSize: '11.5px', gap: '4px' }}
                >
                  <span>🔒</span>
                  <span>Host Portal</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Controls: Live Dot & Hamburger Toggle */}
          <div className="mobile-only-flex" style={{ alignItems: 'center', gap: '8px' }}>
            {/* Minimal Mobile Live Sync Dot */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '28px',
                padding: '0 8px',
                borderRadius: '9999px',
                background: isConnected ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${isConnected ? '#a7f3d0' : '#fecaca'}`,
                fontSize: '10px',
                fontWeight: '700',
                color: isConnected ? '#065f46' : '#991b1b',
              }}
            >
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isConnected ? '#10b981' : '#ef4444',
                display: 'inline-block',
              }} />
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            {/* Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Mobile Menu"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: mobileMenuOpen ? '#0f172a' : '#f1f5f9',
                color: mobileMenuOpen ? '#ffffff' : '#0f172a',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Sheet */}
        {mobileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '60px',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
            padding: '16px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 100,
            animation: 'fade-up 0.2s ease-out',
          }}>
            {/* Mobile User Context Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '12px',
                }}>
                  {isOrganizer ? '👑' : <User size={16} />}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                    {isOrganizer ? (organizerUser?.name || 'Organizer') : (attendeeUser?.name || attendeeUser?.email || 'Guest Explorer')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {isOrganizer ? 'Verified Host Console' : (attendeeUser ? 'Attendee Profile' : 'Not signed in')}
                  </div>
                </div>
              </div>

              {isOrganizer ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOrganizerLogout();
                  }}
                  style={{
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Exit Console
                </button>
              ) : attendeeUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAttendeeLogin();
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Switch
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAttendeeLogin();
                  }}
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Navigation Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isActive ? '#0f172a' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#0f172a',
                      border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconComponent size={16} color={isActive ? '#ffffff' : '#0f172a'} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span style={{
                        background: isActive ? '#ffffff' : '#0f172a',
                        color: isActive ? '#0f172a' : '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '10.5px',
                        fontWeight: '800',
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              {isOrganizer ? (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleCreateClick();
                    }}
                    style={{ flex: 1, padding: '10px', fontSize: '12px' }}
                  >
                    <PlusCircle size={14} />
                    <span>+ New Event</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={{ padding: '10px 14px', fontSize: '12px' }}
                  >
                    <RefreshCw size={13} />
                    <span>Reset Data</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenOrganizerLogin();
                  }}
                  style={{ width: '100%', padding: '10px', fontSize: '12px', justifyContent: 'center' }}
                >
                  <span>🔒 Host Portal Login</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Sticky Bottom Tab Bar (App-like thumb reach) */}
      <nav className="mobile-only-flex" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '62px',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid #e2e8f0',
        zIndex: 49,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
      }}>
        {navItems.slice(0, 4).map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                padding: '6px 12px',
                cursor: 'pointer',
                color: isActive ? '#0f172a' : '#94a3b8',
                gap: '4px',
                position: 'relative',
                flex: 1,
              }}
            >
              <div style={{ position: 'relative' }}>
                <IconComponent size={20} color={isActive ? '#0f172a' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-8px',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: '800',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: '10.5px',
                fontWeight: isActive ? '800' : '600',
                lineHeight: 1,
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
