import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, MapPin, Sparkles, Building, Loader2, Globe, DollarSign } from 'lucide-react';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../utils/currency';
import { CITY_COORDINATES } from '../utils/geolocation';

function formatLocalDateTime(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function CreateEventModal({ onClose, onCreated, organizerKey, organizerUser }) {
  const now = new Date();
  const defaultStartDate = formatLocalDateTime(new Date(now.getTime() + 86400000 * 2));
  const defaultEndDate = formatLocalDateTime(new Date(now.getTime() + 86400000 * 3));
  const minDateTime = formatLocalDateTime(now);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Conference',
    location: 'Bengaluru, Karnataka, India',
    venue_name: 'BIEC Convention Centre, Bengaluru',
    capacity: 500,
    start_date: defaultStartDate,
    end_date: defaultEndDate,
    currency: 'INR',
    country: 'India',
    city: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
  });

  const [tiers, setTiers] = useState([
    { name: 'VIP All-Access', price: 1999, capacity: 100, perks: 'VIP Lounge, Fast-Track Entrance' },
    { name: 'General Admission', price: 499, capacity: 300, perks: 'Standard Access, Expo Floor' },
    { name: 'Student Pass', price: 199, capacity: 100, perks: 'Student ID Required at Door' },
  ]);

  const currSym = getCurrencySymbol(formData.currency);

  const handleSelectQuickCity = (cityKey) => {
    const info = CITY_COORDINATES[cityKey];
    if (!info) return;
    setFormData(prev => ({
      ...prev,
      city: info.name,
      country: info.country,
      location: `${info.name}, ${info.country}`,
      latitude: info.lat,
      longitude: info.lng,
      currency: info.currency || prev.currency,
    }));
  };

  const [pricingMode, setPricingMode] = useState('paid'); // 'paid' | 'free'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addTier = () => {
    setTiers([...tiers, { name: 'Tier ' + (tiers.length + 1), price: 0, capacity: 100, perks: '' }]);
  };

  const removeTier = (index) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, idx) => idx !== index));
  };

  const updateTier = (index, field, value) => {
    const updated = [...tiers];
    updated[index][field] = value;
    setTiers(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Please provide an event title.');
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const gracePeriod = new Date(Date.now() - 3 * 60 * 1000); // 3-minute grace period

    if (!formData.start_date || isNaN(startDate.getTime()) || startDate < gracePeriod) {
      setError('Event start date and time cannot be in the past. Please select an upcoming date and time.');
      return;
    }

    if (!formData.end_date || isNaN(endDate.getTime()) || endDate <= startDate) {
      setError('Event end date and time must be after the start date and time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedTiers = tiers.map(t => ({
        name: t.name,
        price: pricingMode === 'free' ? 0 : (parseFloat(t.price) || 0),
        capacity: parseInt(t.capacity, 10) || 100,
        perks: typeof t.perks === 'string' ? t.perks.split(',').map(s => s.trim()).filter(Boolean) : [],
      }));

      const activeKey = organizerKey || localStorage.getItem('eventpass_organizer_key') || '';

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organizer-key': activeKey,
        },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity, 10) || 500,
          tiers: formattedTiers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create event');
      }

      onCreated(data.eventId);
      onClose();
    } catch (err) {
      console.error('Create event error:', err);
      setError(err.message || 'Failed to create event');
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
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          maxHeight: '90dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '22px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
          padding: '0',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
        }}>
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '6px',
              background: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'inline-block',
              marginBottom: '4px',
            }}>
              👑 Organizer Console
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Create New Event</h2>
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

        {/* Verified Host Audit Bar */}
        <div style={{
          margin: '20px 28px 0',
          padding: '14px 18px',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.04em' }}>
              <span>👑 VERIFIED HOST AUDIT</span>
              <span style={{ color: '#059669', fontSize: '11px' }}>● ACTIVE SESSION</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginTop: '3px' }}>
              {organizerUser?.name || 'Verified Organizer'} • <span style={{ color: '#475569', fontWeight: 'normal' }}>{organizerUser?.organization || 'EventPass System'}</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Tax ID: <strong style={{ color: '#0f172a' }}>{organizerUser?.tax_id || '29AABCE1234F1Z5'}</strong> • Payout Destination: <strong style={{ color: '#059669' }}>{organizerUser?.payout_upi_id || 'Direct Settlement'}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600' }}>CREATION TIMESTAMP</div>
            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '700', fontFamily: 'monospace' }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 28px 24px' }}>
          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
              Event Title *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. NextGen Web Summit 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            />
          </div>

          <div className="grid-form-2col" style={{ marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                Category
              </label>
              <select
                className="select-field"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                <option value="Conference">Tech Conference</option>
                <option value="Hackathon">Hackathon & Fest</option>
                <option value="Workshop">Hands-on Workshop</option>
                <option value="Meetup">Community Meetup</option>
                <option value="Summit">Executive Summit</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                Overall Max Capacity
              </label>
              <input
                type="number"
                min="10"
                className="input-field"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
              Event Description
            </label>
            <textarea
              rows="3"
              className="input-field"
              placeholder="Brief agenda, keynotes, prerequisites..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            />
          </div>

          {/* Dates & Venue */}
          <div className="grid-form-2col" style={{ marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                <Calendar size={13} color="#0f172a" />
                Start Date & Time (Must be upcoming)
              </label>
              <input
                type="datetime-local"
                className="input-field"
                style={{ colorScheme: 'light', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                min={minDateTime}
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                <Calendar size={13} color="#0f172a" />
                End Date & Time
              </label>
              <input
                type="datetime-local"
                className="input-field"
                style={{ colorScheme: 'light', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                min={formData.start_date || minDateTime}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
              />
            </div>
          </div>

          <div className="grid-form-2col" style={{ marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                Venue Name *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. BIEC Convention Centre"
                value={formData.venue_name}
                onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                City, State / Location *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Bengaluru, Karnataka, India"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              />
            </div>
          </div>

          {/* Quick City & Country Selector Pills */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>
              📍 Quick City Presets (Auto-sets country, currency & GPS coordinates):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { key: 'bengaluru', label: '🇮🇳 Bengaluru' },
                { key: 'hyderabad', label: '🇮🇳 Hyderabad' },
                { key: 'mumbai', label: '🇮🇳 Mumbai' },
                { key: 'delhi', label: '🇮🇳 Delhi NCR' },
                { key: 'chennai', label: '🇮🇳 Chennai' },
                { key: 'pune', label: '🇮🇳 Pune' },
                { key: 'san francisco', label: '🇺🇸 San Francisco' },
                { key: 'london', label: '🇬🇧 London' },
              ].map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => handleSelectQuickCity(c.key)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    border: formData.city?.toLowerCase() === c.key.toLowerCase() ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    background: formData.city?.toLowerCase() === c.key.toLowerCase() ? '#0f172a' : '#ffffff',
                    color: formData.city?.toLowerCase() === c.key.toLowerCase() ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event Pricing Option & Organizer Currency Selector */}
          <div style={{ marginBottom: '22px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                Event Pricing & Currency *
              </label>

              {/* Organizer Currency Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Currency:</span>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {Object.values(SUPPORTED_CURRENCIES).map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.code} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setPricingMode('free');
                  setTiers(tiers.map(t => ({ ...t, price: 0 })));
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: pricingMode === 'free' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                  background: pricingMode === 'free' ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: pricingMode === 'free' ? '#0f172a' : '#f1f5f9',
                  color: pricingMode === 'free' ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '13px',
                }}>
                  {currSym}0
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                    100% Free Event
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    No payment required for any student pass
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricingMode('paid');
                  if (tiers.every(t => Number(t.price) === 0)) {
                    setTiers([
                      { name: 'VIP All-Access', price: formData.currency === 'INR' ? 1999 : 199, capacity: 100, perks: 'VIP Lounge, Fast-Track Entrance' },
                      { name: 'General Admission', price: formData.currency === 'INR' ? 499 : 49, capacity: 300, perks: 'Standard Access, Expo Floor' },
                      { name: 'Student Pass', price: formData.currency === 'INR' ? 199 : 0, capacity: 100, perks: 'Student ID Required at Door' },
                    ]);
                  }
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: pricingMode === 'paid' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                  background: pricingMode === 'paid' ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: pricingMode === 'paid' ? '#0f172a' : '#f1f5f9',
                  color: pricingMode === 'paid' ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '13px',
                }}>
                  {currSym}
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                    Paid / Tiered Event ({formData.currency})
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Charge custom pricing in {formData.currency}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Ticket Tiers */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                  Ticket Tiers & Quotas
                </label>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  {pricingMode === 'free' ? 'All tiers are locked to 0 Free' : 'Configure pricing and perks per ticket category'}
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={addTier}
                style={{ padding: '6px 12px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                <Plus size={14} /> Add Tier
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tiers.map((tier, idx) => (
                <div
                  key={idx}
                  className="tier-builder-row"
                  style={{
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Tier Name"
                    value={tier.name}
                    onChange={(e) => updateTier(idx, 'name', e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                  />
                  {pricingMode === 'free' ? (
                    <div
                      title="This event is marked 100% Free"
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#059669',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        textAlign: 'center',
                        userSelect: 'none',
                      }}
                    >
                      {currSym}0 FREE
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder={`Price (${currSym})`}
                      value={tier.price}
                      onChange={(e) => updateTier(idx, 'price', e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                    />
                  )}
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="Limit"
                    value={tier.capacity}
                    onChange={(e) => updateTier(idx, 'capacity', e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Perks (comma-sep)"
                    value={tier.perks}
                    onChange={(e) => updateTier(idx, 'perks', e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeTier(idx)}
                    disabled={tiers.length <= 1}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: tiers.length <= 1 ? '#cbd5e1' : '#dc2626',
                      cursor: tiers.length <= 1 ? 'not-allowed' : 'pointer',
                      padding: '4px',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '14px' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={16} />}
            Publish Event & Configure Passes
          </button>
        </form>
      </div>
    </div>
  );
}
