import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Navbar from './components/Navbar';
import EventCatalog from './components/EventCatalog';
import RegistrationModal from './components/RegistrationModal';
import TicketSuccessModal from './components/TicketSuccessModal';
import DigitalTicketPass from './components/DigitalTicketPass';
import EntranceScanner from './components/EntranceScanner';
import LiveDashboard from './components/LiveDashboard';
import CreateEventModal from './components/CreateEventModal';
import EditEventModal from './components/EditEventModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import EmailOutboxView from './components/EmailOutboxView';
import IntroductionPage from './components/IntroductionPage';
import OrganizerAuthModal from './components/OrganizerAuthModal';
import AttendeeAuthModal from './components/AttendeeAuthModal';
import MyPassesView from './components/MyPassesView';
import UserProfileView from './components/UserProfileView';
import AiChatbot from './components/AiChatbot';
import { requestUserLocation, detectDefaultCountry } from './utils/geolocation';

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('intro'); // 'intro' | 'events' | 'scanner' | 'dashboard' | 'outbox' | 'pass'
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [currentPassCode, setCurrentPassCode] = useState(null);
  const [initialScannerCode, setInitialScannerCode] = useState(null);

  // User Geolocation & Radius Settings (Defaults to India / Bengaluru)
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const stored = localStorage.getItem('eventpass_user_location');
      return stored ? JSON.parse(stored) : detectDefaultCountry();
    } catch {
      return detectDefaultCountry();
    }
  });

  const handleRequestUserLocation = async () => {
    try {
      const loc = await requestUserLocation();
      if (loc) {
        setUserLocation(loc);
        localStorage.setItem('eventpass_user_location', JSON.stringify(loc));
        showToast(loc.source === 'gps' ? '📍 GPS location acquired! Filter events by your chosen radius.' : '📍 Region set to India.');
      }
    } catch (err) {
      console.warn('Geolocation request failed:', err);
    }
  };

  // Multi-Currency Selection (organizer-driven events)
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('eventpass_currency') || 'INR');
  const setCurrency = (c) => {
    setCurrencyState(c);
    localStorage.setItem('eventpass_currency', c);
  };

  // Attendee Identity Session (Per-User Pass Vault & Catalog Filtering)
  const [attendeeUser, setAttendeeUser] = useState(() => {
    try {
      const stored = localStorage.getItem('eventpass_attendee_profile');
      if (stored) return JSON.parse(stored);
      const email = localStorage.getItem('eventpass_attendee_email');
      const name = localStorage.getItem('eventpass_attendee_name');
      if (email) return { email, name: name || email.split('@')[0] };
      return null;
    } catch {
      return null;
    }
  });

  const [myRegistrations, setMyRegistrations] = useState([]);
  const [showAttendeeAuthModal, setShowAttendeeAuthModal] = useState(false);
  const [pendingEventForAuth, setPendingEventForAuth] = useState(null);

  // Registration gate: attendee MUST be in database / signed in before opening registration
  const handleStartRegistration = (event) => {
    if (!attendeeUser) {
      setPendingEventForAuth(event);
      setShowAttendeeAuthModal(true);
      showToast('🔒 Please sign in or create an attendee account to register.');
      return;
    }
    setRegisteringEvent(event);
  };

  // Sync active registrations strictly for the current attendeeUser
  const fetchMyRegistrations = async (emailToSync) => {
    const targetEmail = emailToSync || attendeeUser?.email;
    if (!targetEmail) {
      setMyRegistrations([]);
      setMyPassesCount(0);
      return;
    }

    try {
      const res = await fetch(`/api/tickets/my-registrations?email=${encodeURIComponent(targetEmail.trim().toLowerCase())}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.registrations)) {
        const mapped = data.registrations.map(r => ({
          eventId: r.event_id,
          ticketCode: r.ticket_code,
          seatNumber: r.seat_number,
          tierName: r.tier_name,
          paymentAmount: r.payment_amount,
          createdAt: r.created_at,
          eventTitle: r.event_title,
        }));
        setMyRegistrations(mapped);
        setMyPassesCount(mapped.length);
        localStorage.setItem('eventpass_my_registrations', JSON.stringify(mapped));
      } else {
        setMyRegistrations([]);
        setMyPassesCount(0);
        localStorage.setItem('eventpass_my_registrations', '[]');
      }
    } catch (err) {
      console.warn('Failed to sync attendee registrations:', err);
    }
  };

  useEffect(() => {
    if (attendeeUser?.email) {
      fetchMyRegistrations(attendeeUser.email);
    } else {
      setMyRegistrations([]);
      setMyPassesCount(0);
    }
  }, [attendeeUser?.email]);

  const handleAttendeeLoginSuccess = (profile) => {
    setAttendeeUser(profile);
    localStorage.setItem('eventpass_attendee_profile', JSON.stringify(profile));
    localStorage.setItem('eventpass_attendee_email', profile.email);
    if (profile.name) localStorage.setItem('eventpass_attendee_name', profile.name);
    fetchMyRegistrations(profile.email);
    showToast(`👤 Signed in as ${profile.name || profile.email}. Pass vault synced!`);

    // If user was redirected to auth while attempting to register for an event, automatically proceed!
    if (pendingEventForAuth) {
      const evt = pendingEventForAuth;
      setPendingEventForAuth(null);
      setTimeout(() => {
        setRegisteringEvent(evt);
      }, 200);
    }
  };

  const handleAttendeeLogout = () => {
    setAttendeeUser(null);
    setMyRegistrations([]);
    setMyPassesCount(0);
    localStorage.removeItem('eventpass_attendee_profile');
    localStorage.removeItem('eventpass_attendee_email');
    localStorage.removeItem('eventpass_attendee_name');
    localStorage.removeItem('eventpass_my_registrations');
    showToast('Signed out of Attendee Profile. Showing public guest view.');
  };

  // Track count of user's registered passes for badge
  const [myPassesCount, setMyPassesCount] = useState(0);

  // Role-Based Access Control (Organizer vs Attendee)
  const [organizerKey, setOrganizerKey] = useState(() => localStorage.getItem('eventpass_organizer_key') || '');
  const [organizerUser, setOrganizerUser] = useState(() => {
    try {
      const stored = localStorage.getItem('eventpass_organizer_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isOrganizer, setIsOrganizer] = useState(() => !!localStorage.getItem('eventpass_organizer_key'));
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Modals & Notifications
  const [registeringEvent, setRegisteringEvent] = useState(null);
  const [successTicket, setSuccessTicket] = useState(null);
  const [successEmailPreview, setSuccessEmailPreview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const handleOrganizerLoginSuccess = (token, user) => {
    setOrganizerKey(token);
    setOrganizerUser(user || null);
    setIsOrganizer(true);
    localStorage.setItem('eventpass_organizer_key', token);
    if (user) {
      localStorage.setItem('eventpass_organizer_user', JSON.stringify(user));
    }
    const nameStr = user?.name ? `${user.name} (${user.organization || 'Verified Organizer'})` : 'Organizer';
    showToast(`👑 Welcome, ${nameStr}! Console unlocked.`);
  };

  const handleOrganizerLogout = () => {
    setOrganizerKey('');
    setOrganizerUser(null);
    setIsOrganizer(false);
    localStorage.removeItem('eventpass_organizer_key');
    localStorage.removeItem('eventpass_organizer_user');
    showToast('Locked console. Switched back to Attendee Mode.');
  };

  // Socket
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch all events
  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
        if (!selectedEventId && data.events.length > 0) {
          setSelectedEventId(data.events[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Verify stored organizer session token if present
    const storedKey = localStorage.getItem('eventpass_organizer_key');
    if (storedKey) {
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedKey}`,
          'x-organizer-key': storedKey,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.organizer) {
            setOrganizerUser(data.organizer);
            setIsOrganizer(true);
            localStorage.setItem('eventpass_organizer_user', JSON.stringify(data.organizer));
          } else {
            // Token is invalid/expired
            setOrganizerKey('');
            setOrganizerUser(null);
            setIsOrganizer(false);
            localStorage.removeItem('eventpass_organizer_key');
            localStorage.removeItem('eventpass_organizer_user');
          }
        })
        .catch(err => {
          console.error('Session verify error:', err);
        });
    }

    // Check path for deep linking: /ticket/:code or /scanner or /dashboard
    const path = window.location.pathname;
    if (path.startsWith('/ticket/')) {
      const code = path.replace('/ticket/', '').trim();
      if (code) {
        setCurrentPassCode(code);
        setActiveTab('pass');
      }
    } else if (path === '/scanner') {
      setActiveTab('scanner');
    } else if (path === '/dashboard') {
      setActiveTab('dashboard');
    }

    // Initialize Socket.io connection (auto-connects to same origin in unified deployment, or custom API URL if set)
    const serverUrl = import.meta.env.VITE_API_URL || undefined;
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to EventPass real-time server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('event:updated', (updatedEvt) => {
      fetchEvents();
    });

    newSocket.on('event:deleted', ({ eventId }) => {
      fetchEvents();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handlers
  const handleResetSeed = async () => {
    try {
      const res = await fetch('/api/events/reset-seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchEvents();
        showToast('Database successfully reset and reseeded with realistic demo attendees!');
      }
    } catch (e) {
      console.error('Reset error:', e);
    }
  };

  const handleLookupCode = (code) => {
    setCurrentPassCode(code);
    setActiveTab('pass');
    window.history.pushState(null, '', `/ticket/${code}`);
  };

  const handleOpenPass = (code) => {
    setSuccessTicket(null);
    setCurrentPassCode(code);
    setActiveTab('pass');
    window.history.pushState(null, '', `/ticket/${code}`);
  };

  const handleOpenScanner = (testCode) => {
    setSuccessTicket(null);
    setInitialScannerCode(testCode || null);
    setActiveTab('scanner');
  };

  const handleOpenDashboard = (eventId) => {
    if (eventId) setSelectedEventId(eventId);
    setActiveTab('dashboard');
  };

  const handleRegistrationSuccess = (ticket, previewUrl, registeredProfile) => {
    setRegisteringEvent(null);
    setSuccessTicket(ticket);
    setSuccessEmailPreview(previewUrl);
    fetchEvents(); // Refresh counts

    // If new or different attendee registered, establish session
    if (registeredProfile?.email) {
      handleAttendeeLoginSuccess(registeredProfile);
    } else if (ticket?.attendee_email) {
      handleAttendeeLoginSuccess({
        email: ticket.attendee_email,
        name: ticket.attendee_name || '',
      });
    } else if (attendeeUser?.email) {
      fetchMyRegistrations(attendeeUser.email);
    }
  };

  const handleEventCreated = (newEventId) => {
    fetchEvents();
    setSelectedEventId(newEventId);
    setActiveTab('dashboard');
    showToast('New event created and passes configured successfully!');
  };

  const handleEventUpdated = (updatedEvent) => {
    fetchEvents();
    setEditingEvent(null);
    showToast(`Event schedule for "${updatedEvent.title}" updated successfully!`);
  };

  const handleConfirmDelete = (deletedEventId) => {
    fetchEvents();
    setDeletingEvent(null);
    if (selectedEventId === deletedEventId) {
      const remaining = events.filter(e => e.id !== deletedEventId);
      setSelectedEventId(remaining.length > 0 ? remaining[0].id : null);
    }
    showToast('Event and associated passes deleted successfully.');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 999,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          fontSize: '13px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fade-down 0.25s ease-out',
        }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'pass') {
            window.history.pushState(null, '', '/');
          }
        }}
        isConnected={isConnected}
        onOpenCreateEvent={() => setShowCreateModal(true)}
        onResetSeed={handleResetSeed}
        isOrganizer={isOrganizer}
        organizerUser={organizerUser}
        onOpenOrganizerLogin={() => setShowAuthModal(true)}
        onOrganizerLogout={handleOrganizerLogout}
        attendeeUser={attendeeUser}
        onOpenAttendeeLogin={() => setShowAttendeeAuthModal(true)}
        onAttendeeLogout={handleAttendeeLogout}
        myPassesCount={myPassesCount}
        userLocation={userLocation}
        onOpenLocationSettings={handleRequestUserLocation}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {loading ? (
          <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center' }}>
            <div className="shimmer" style={{ height: '300px', borderRadius: '20px' }} />
            <p style={{ marginTop: '20px', color: '#94a3b8' }}>Loading EventPass Engine...</p>
          </div>
        ) : (
          <>
            {activeTab === 'intro' && (
              <IntroductionPage
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  window.history.pushState(null, '', '/');
                }}
                onOpenCreateEvent={isOrganizer ? () => setShowCreateModal(true) : null}
                isOrganizer={isOrganizer}
              />
            )}

            {activeTab === 'events' && (
              <EventCatalog
                events={events}
                onSelectEvent={(id) => setSelectedEventId(id)}
                onRegister={(ev) => handleStartRegistration(ev)}
                onLookupCode={handleLookupCode}
                onOpenDashboard={handleOpenDashboard}
                onEditEvent={(ev) => setEditingEvent(ev)}
                onDeleteEvent={(ev) => setDeletingEvent(ev)}
                onOpenCreateEvent={isOrganizer ? () => setShowCreateModal(true) : null}
                isOrganizer={isOrganizer}
                userLocation={userLocation}
                onRequestLocationPermission={handleRequestUserLocation}
                attendeeUser={attendeeUser}
                myRegistrations={myRegistrations}
                onOpenAttendeeLogin={() => setShowAttendeeAuthModal(true)}
                onAttendeeLogout={handleAttendeeLogout}
                onRefreshRegistrations={() => fetchMyRegistrations()}
              />
            )}

            {activeTab === 'my-passes' && (
              <MyPassesView
                onOpenPass={handleLookupCode}
                onExploreEvents={() => setActiveTab('events')}
                currency={currency}
                onPassesCountChange={setMyPassesCount}
                attendeeUser={attendeeUser}
                onOpenAttendeeLogin={() => setShowAttendeeAuthModal(true)}
                onAttendeeLogout={handleAttendeeLogout}
                onAttendeeLogin={handleAttendeeLoginSuccess}
                onOpenProfile={() => setActiveTab('profile')}
              />
            )}

            {activeTab === 'profile' && (
              <UserProfileView
                attendeeUser={attendeeUser}
                onUpdateProfile={(updated) => handleAttendeeLoginSuccess(updated)}
                onOpenPasses={() => setActiveTab('my-passes')}
                onExploreEvents={() => setActiveTab('events')}
                onOpenLogin={() => setShowAttendeeAuthModal(true)}
                onLogout={handleAttendeeLogout}
              />
            )}

            {activeTab === 'scanner' && (
              <EntranceScanner
                events={events}
                initialEventId={selectedEventId}
                initialTestCode={initialScannerCode}
              />
            )}

            {activeTab === 'dashboard' && (
              <LiveDashboard
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={(id) => setSelectedEventId(id)}
                onOpenPass={handleLookupCode}
                onEditEvent={(ev) => setEditingEvent(ev)}
                onDeleteEvent={(ev) => setDeletingEvent(ev)}
                onOpenCreateEvent={isOrganizer ? () => setShowCreateModal(true) : null}
                socket={socket}
                isOrganizer={isOrganizer}
                organizerKey={organizerKey}
                organizerUser={organizerUser}
              />
            )}

            {activeTab === 'outbox' && (
              <EmailOutboxView />
            )}

            {activeTab === 'pass' && (
              <DigitalTicketPass
                ticketCode={currentPassCode}
                onBack={() => {
                  setActiveTab('events');
                  window.history.pushState(null, '', '/');
                }}
                onOpenScanner={handleOpenScanner}
                currency={currency}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {registeringEvent && (
        <RegistrationModal
          event={registeringEvent}
          onClose={() => setRegisteringEvent(null)}
          onSuccess={handleRegistrationSuccess}
          onOpenPass={handleOpenPass}
          currency={currency}
          attendeeUser={attendeeUser}
        />
      )}

      {showAttendeeAuthModal && (
        <AttendeeAuthModal
          pendingEvent={pendingEventForAuth}
          currentAttendee={attendeeUser}
          onClose={() => {
            setShowAttendeeAuthModal(false);
            setPendingEventForAuth(null);
          }}
          onSuccess={handleAttendeeLoginSuccess}
          onLogout={handleAttendeeLogout}
        />
      )}

      {successTicket && (
        <TicketSuccessModal
          ticket={successTicket}
          emailPreviewUrl={successEmailPreview}
          onClose={() => setSuccessTicket(null)}
          onOpenPass={handleOpenPass}
          onOpenScanner={handleOpenScanner}
          onOpenOutbox={() => {
            setSuccessTicket(null);
            setActiveTab('outbox');
          }}
        />
      )}

      {showAuthModal && (
        <OrganizerAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleOrganizerLoginSuccess}
        />
      )}

      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleEventCreated}
          organizerKey={organizerKey}
          organizerUser={organizerUser}
        />
      )}

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onUpdated={handleEventUpdated}
          onDeleteRequest={(ev) => {
            setEditingEvent(null);
            setDeletingEvent(ev);
          }}
          organizerKey={organizerKey}
          organizerUser={organizerUser}
        />
      )}

      {deletingEvent && (
        <DeleteConfirmModal
          event={deletingEvent}
          onClose={() => setDeletingEvent(null)}
          onConfirmDelete={handleConfirmDelete}
          organizerKey={organizerKey}
          organizerUser={organizerUser}
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <strong style={{ color: '#0f172a' }}>EventPass Security Engine</strong> • Cryptographic JWT Verification & Doorbell Scanner
          </div>
          <div>
            Built with React, Node.js, Express, SQLite, Socket.io, and Nodemailer
          </div>
        </div>
      </footer>

      {/* Floating AI Concierge Chatbot */}
      <AiChatbot
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectEvent={(evt) => {
          setSelectedEventId(evt.id);
          setActiveTab('events');
          setRegisteringEvent(evt);
        }}
        onOpenPass={(ticketCode) => {
          setCurrentPassCode(ticketCode);
          setActiveTab('pass');
        }}
        onOpenCreateEvent={() => {
          if (isOrganizer) {
            setShowCreateModal(true);
          } else {
            setShowAuthModal(true);
            showToast('🔒 Please sign in as an organizer to create events.');
          }
        }}
        isOrganizer={isOrganizer}
        organizerUser={organizerUser}
        organizerKey={organizerKey}
        attendeeUser={attendeeUser}
        events={events}
      />
    </div>
  );
}
