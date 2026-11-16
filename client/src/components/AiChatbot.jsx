import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Sparkles, Send, X, Minimize2, Trash2, ExternalLink, 
  ChevronRight, Calendar, Ticket, RotateCcw, ShieldCheck, 
  MessageSquare, ArrowUp, RefreshCw, Briefcase, User, Globe, PlusCircle
} from 'lucide-react';

/**
 * Returns role-tailored initial greeting & smart suggestions
 */
function getWelcomeMessageForPersona(role, user) {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (role === 'organizer') {
    const displayName = user?.name || user?.email || 'Organizer';
    return {
      id: 'welcome_organizer_' + Date.now(),
      sender: 'bot',
      text: `👋 Welcome back, **${displayName}**! I'm your **EventPass Organizer AI Co-Pilot** 🏢.\n\nI have live access to your ticket sales, gross revenue, entrance door check-in logs, and event publishing tools. How can I assist you with your events today?`,
      timestamp,
      suggestions: [
        "📊 How many tickets have I sold?",
        "💰 Show my revenue and earnings",
        "➕ How do I create a new event?",
        "🚪 How does door scanning work?",
        "📈 View live attendance stats"
      ],
      actions: [
        { label: "Open Organizer Dashboard", action: "NAVIGATE_TAB", tab: "dashboard" },
        { label: "Launch Door Scanner", action: "NAVIGATE_TAB", tab: "scanner" }
      ]
    };
  }

  if (role === 'attendee') {
    const displayName = user?.name || user?.email?.split('@')[0] || 'Attendee';
    return {
      id: 'welcome_attendee_' + Date.now(),
      sender: 'bot',
      text: `👋 Hi **${displayName}**! I'm your **EventPass Attendee Concierge** 👤.\n\nI can retrieve your registered passes, show your seat assignments, explain our tiered refund policy, or help you discover new upcoming events. What would you like to check?`,
      timestamp,
      suggestions: [
        "🎟️ Where are my registered passes?",
        "🔄 Explain refund & cancellation policy",
        "🎓 Show free student tickets",
        "📍 Events in Bengaluru",
        "🛡️ How do I check in with my QR pass?"
      ],
      actions: [
        { label: "Open My Passes Vault", action: "NAVIGATE_TAB", tab: "passes" },
        { label: "Browse Active Events", action: "NAVIGATE_TAB", tab: "events" }
      ]
    };
  }

  // Guest
  return {
    id: 'welcome_guest_' + Date.now(),
    sender: 'bot',
    text: "👋 Hi there! I'm your **EventPass AI Concierge** 🌐.\n\nHow can I help you today? Ask me about upcoming events, free student passes, seat availability, ticket refunds, or sign in to access your personal ticket vault.",
    timestamp,
    suggestions: [
      "🎟️ What events are upcoming?",
      "🎓 Show free student tickets",
      "🔄 Explain refund policy",
      "📍 Bengaluru events",
      "🛡️ How does QR scanning work?"
    ],
    actions: [
      { label: "Browse Active Events", action: "NAVIGATE_TAB", tab: "events" }
    ]
  };
}

export default function AiChatbot({ 
  onNavigateTab, 
  onSelectEvent, 
  onOpenPass, 
  onOpenCreateEvent,
  isOrganizer = false,
  organizerUser = null,
  organizerKey = '',
  attendeeUser = null,
  events = [] 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);

  // Active persona: 'organizer' | 'attendee' | 'guest'
  const [activePersona, setActivePersona] = useState(() => {
    if (isOrganizer) return 'organizer';
    if (attendeeUser) return 'attendee';
    return 'guest';
  });

  // Keep active persona synchronized when auth state transitions occur
  useEffect(() => {
    if (isOrganizer) {
      setActivePersona('organizer');
    } else if (attendeeUser) {
      setActivePersona('attendee');
    } else {
      setActivePersona('guest');
    }
  }, [isOrganizer, attendeeUser?.email]);

  // Derive isolated session key
  const activeUserIdentifier = activePersona === 'organizer'
    ? (organizerUser?.email || organizerUser?.id || 'organizer_host')
    : (activePersona === 'attendee' ? (attendeeUser?.email || 'attendee_user') : 'guest_anonymous');
  
  const currentSessionKey = `${activePersona}::${activeUserIdentifier.toLowerCase()}`;

  // Session storage store: { [sessionKey]: Array<Message> }
  const [sessionStore, setSessionStore] = useState(() => {
    try {
      const saved = sessionStorage.getItem('eventpass_ai_sessions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Current conversation messages
  const [messages, setMessages] = useState(() => {
    const existing = sessionStore[currentSessionKey];
    if (existing && existing.length > 0) return existing;
    return [getWelcomeMessageForPersona(activePersona, activePersona === 'organizer' ? organizerUser : attendeeUser)];
  });

  const activeSessionKeyRef = useRef(currentSessionKey);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // When session key changes (e.g. login, role toggle, logout):
  // 1. Save old session messages
  // 2. Load or initialize target session messages
  useEffect(() => {
    const prevKey = activeSessionKeyRef.current;
    if (prevKey !== currentSessionKey) {
      // Save prior messages
      setSessionStore((prevStore) => {
        const updated = { ...prevStore, [prevKey]: messages };
        try {
          sessionStorage.setItem('eventpass_ai_sessions', JSON.stringify(updated));
        } catch (e) {
          console.warn('Could not persist chatbot sessions:', e);
        }
        return updated;
      });

      // Load new messages for the current session
      const targetMessages = sessionStore[currentSessionKey];
      if (targetMessages && targetMessages.length > 0) {
        setMessages(targetMessages);
      } else {
        const freshWelcome = getWelcomeMessageForPersona(
          activePersona, 
          activePersona === 'organizer' ? organizerUser : attendeeUser
        );
        setMessages([freshWelcome]);
      }

      activeSessionKeyRef.current = currentSessionKey;
      setUnreadCount(0);
    }
  }, [currentSessionKey, activePersona]);

  // Auto-scroll on new message or open
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Persist messages whenever they change
  const updateMessages = (newMessages) => {
    setMessages(newMessages);
    setSessionStore((prev) => {
      const updated = { ...prev, [currentSessionKey]: newMessages };
      try {
        sessionStorage.setItem('eventpass_ai_sessions', JSON.stringify(updated));
      } catch (e) {
        console.warn('Session save error:', e);
      }
      return updated;
    });
  };

  const handleSendMessage = async (textToSend) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMsgId = 'usr_' + Date.now();
    const newUserMsg = {
      id: userMsgId,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, newUserMsg];
    updateMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(isOrganizer && organizerKey ? { 
            'x-organizer-key': organizerKey, 
            'Authorization': `Bearer ${organizerKey}` 
          } : {})
        },
        body: JSON.stringify({
          message: queryText,
          role: activePersona,
          organizerEmail: isOrganizer ? organizerUser?.email : undefined,
          organizerId: isOrganizer ? organizerUser?.id : undefined,
          attendeeEmail: activePersona === 'attendee' ? attendeeUser?.email : undefined,
          history: nextMessages.slice(-6).map((m) => ({ role: m.sender, text: m.text }))
        })
      });

      const data = await res.json();

      const botMsgId = 'bot_' + Date.now();
      const newBotMsg = {
        id: botMsgId,
        sender: 'bot',
        text: data.reply || "I'm having trouble answering right now. Please check our Events catalog or ask another question.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestions || [],
        actions: data.actions || []
      };

      updateMessages([...nextMessages, newBotMsg]);
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      updateMessages([
        ...nextMessages,
        {
          id: 'bot_err_' + Date.now(),
          sender: 'bot',
          text: "⚠️ Sorry, I could not connect to the EventPass server. Please check your network connection or try again shortly.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: ["Try again", "Browse active events"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (act) => {
    if (act.action === 'NAVIGATE_TAB' && onNavigateTab) {
      onNavigateTab(act.tab);
    } else if (act.action === 'CREATE_EVENT') {
      if (onOpenCreateEvent) {
        onOpenCreateEvent();
      } else if (onNavigateTab) {
        onNavigateTab('dashboard');
      }
    } else if (act.action === 'VIEW_EVENT' && onSelectEvent) {
      const targetEvt = events.find((e) => e.id === act.eventId);
      if (targetEvt) {
        onSelectEvent(targetEvt);
      } else if (onNavigateTab) {
        onNavigateTab('events');
      }
    } else if (act.action === 'OPEN_PASS' && onOpenPass) {
      onOpenPass(act.ticketCode);
    }
  };

  const clearChat = () => {
    const freshWelcome = getWelcomeMessageForPersona(
      activePersona,
      activePersona === 'organizer' ? organizerUser : attendeeUser
    );
    updateMessages([freshWelcome]);
  };

  // Helper to format basic markdown (bold, lists, backticks)
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');

    return (
      <div style={{ lineHeight: '1.55', fontSize: '13px' }}>
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} style={{ height: '6px' }} />;
          }

          // Bullet point
          const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('• ') || line.trim().startsWith('- ');
          let content = isBullet ? line.trim().replace(/^[\*\•\-]\s*/, '') : line;

          // Replace **bold** with <strong> and `code` with <code>
          const parts = content.split(/(\*\*.*?\*\*|`.*?`)/g);

          return (
            <div 
              key={idx} 
              style={{ 
                display: isBullet ? 'flex' : 'block', 
                alignItems: isBullet ? 'flex-start' : 'inherit', 
                gap: isBullet ? '6px' : '0',
                marginBottom: '4px' 
              }}
            >
              {isBullet && <span style={{ color: '#0f172a', fontWeight: '800' }}>•</span>}
              <div>
                {parts.map((p, pIdx) => {
                  if (p.startsWith('**') && p.endsWith('**')) {
                    return <strong key={pIdx} style={{ color: '#0f172a' }}>{p.slice(2, -2)}</strong>;
                  }
                  if (p.startsWith('`') && p.endsWith('`')) {
                    return (
                      <code key={pIdx} style={{
                        background: '#f1f5f9',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: '#0f172a'
                      }}>
                        {p.slice(1, -1)}
                      </code>
                    );
                  }
                  return p;
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Determine header UI labels based on active persona
  const getPersonaBadge = () => {
    if (activePersona === 'organizer') {
      return {
        tag: 'ORGANIZER CO-PILOT',
        sub: `🏢 Host: ${organizerUser?.name || organizerUser?.email || 'Verified Organizer'}`,
        badgeBg: '#0f172a',
        badgeColor: '#ffffff',
        dotColor: '#38bdf8'
      };
    }
    if (activePersona === 'attendee') {
      return {
        tag: 'ATTENDEE VAULT',
        sub: `👤 Attendee: ${attendeeUser?.name || attendeeUser?.email}`,
        badgeBg: '#047857',
        badgeColor: '#ffffff',
        dotColor: '#10b981'
      };
    }
    return {
      tag: 'PUBLIC CONCIERGE',
      sub: '🌐 Public Event Explorer',
      badgeBg: '#f1f5f9',
      badgeColor: '#475569',
      dotColor: '#94a3b8'
    };
  };

  const personaMeta = getPersonaBadge();

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <div className="ai-chatbot-launcher" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          {unreadCount > 0 && (
            <div 
              onClick={() => setIsOpen(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '8px 14px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
                fontSize: '12px',
                fontWeight: '700',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'fadeSlideUp 0.3s ease-out'
              }}
            >
              <Sparkles size={14} color="#0f172a" />
              <span>Ask AI Assistant</span>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: personaMeta.dotColor,
                boxShadow: `0 0 6px ${personaMeta.dotColor}`
              }} />
            </div>
          )}

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open EventPass AI Assistant"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid #334155',
              boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Bot size={24} />
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: personaMeta.dotColor,
              border: '2px solid #0f172a',
              boxShadow: `0 0 6px ${personaMeta.dotColor}`
            }} />
          </button>
        </div>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="ai-chatbot-window" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '400px',
          maxWidth: 'calc(100vw - 32px)',
          height: '600px',
          maxHeight: 'calc(100vh - 48px)',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 99999,
          overflow: 'hidden',
          animation: 'fadeSlideUp 0.25s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#0f172a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <Bot size={20} />
                  <span style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: personaMeta.dotColor,
                    border: '1.5px solid #ffffff'
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>EventPass AI</span>
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: '800',
                      background: personaMeta.badgeBg,
                      border: '1px solid rgba(0,0,0,0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      color: personaMeta.badgeColor,
                      letterSpacing: '0.04em'
                    }}>
                      {personaMeta.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                    {personaMeta.sub}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={clearChat}
                  title="Clear This Conversation"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    padding: '6px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#b91c1c';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Minimize Chat"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    padding: '6px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Optional Persona Switcher Pill (Active when user holds both Organizer & Attendee sessions) */}
            {isOrganizer && attendeeUser && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: '#ffffff',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                width: 'fit-content'
              }}>
                <button
                  type="button"
                  onClick={() => setActivePersona('organizer')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: activePersona === 'organizer' ? '#0f172a' : 'transparent',
                    color: activePersona === 'organizer' ? '#ffffff' : '#64748b'
                  }}
                >
                  <Briefcase size={12} />
                  Organizer Mode
                </button>
                <button
                  type="button"
                  onClick={() => setActivePersona('attendee')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: activePersona === 'attendee' ? '#0f172a' : 'transparent',
                    color: activePersona === 'attendee' ? '#ffffff' : '#64748b'
                  }}
                >
                  <User size={12} />
                  Attendee Mode
                </button>
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: '#f8fafc'
          }}>
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    padding: '12px 14px',
                    borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    background: isUser ? '#0f172a' : '#ffffff',
                    color: isUser ? '#ffffff' : '#0f172a',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    boxShadow: isUser ? 'none' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                    fontSize: '13px'
                  }}>
                    {isUser ? (
                      <div style={{ lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    ) : (
                      renderFormattedText(msg.text)
                    )}
                  </div>

                  {/* Action Buttons attached to Bot Message */}
                  {!isUser && msg.actions && msg.actions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {msg.actions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          onClick={() => handleActionClick(act)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
                          }}
                        >
                          <ChevronRight size={13} />
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Suggestion Pills attached to Bot Message */}
                  {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleSendMessage(sug)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '9999px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#0f172a';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {/* Thinking / Typing Animation */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', width: 'fit-content' }}>
                <Bot size={14} color="#0f172a" />
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>EventPass AI is retrieving data...</span>
                <span className="animate-spin" style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #cbd5e1', borderTopColor: '#0f172a' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Prompt Strip & Input */}
          <div style={{ padding: '12px 14px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  activePersona === 'organizer'
                    ? "Ask about ticket sales, revenue, scanner, or events..."
                    : "Ask about events, passes, seats, or refunds..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: input.trim() && !loading ? '#0f172a' : '#f1f5f9',
                  color: input.trim() && !loading ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease'
                }}
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            </form>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '10.5px',
              color: '#94a3b8'
            }}>
              <span>EventPass AI Engine</span>
              <span>Isolated {activePersona.toUpperCase()} Session</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
