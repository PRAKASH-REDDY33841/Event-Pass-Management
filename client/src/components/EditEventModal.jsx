import React, { useState } from 'react';
import { X, Calendar, MapPin, Building, Sparkles, Loader2, FastForward, Rewind, RotateCcw, AlertTriangle, Trash2, ArrowRight, DollarSign } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { CITY_COORDINATES } from '../utils/geolocation';

function formatLocalDateTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function calculateDateShift(originalStartStr, newStartStr) {
  const orig = new Date(originalStartStr).getTime();
  const next = new Date(newStartStr).getTime();
  if (isNaN(orig) || isNaN(next)) return null;

  const diffMs = next - orig;
  if (Math.abs(diffMs) < 60000) {
    return { type: 'UNCHANGED', text: 'No date shift (same schedule)' };
  }

  const isPostpone = diffMs > 0;
  const absDiffHours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));
  const absDiffDays = Math.floor(absDiffHours / 24);
  const remHours = absDiffHours % 24;

  let durationText = '';
  if (absDiffDays > 0) {
    durationText += `${absDiffDays} day${absDiffDays > 1 ? 's' : ''}`;
    if (remHours > 0) durationText += ` ${remHours} hr${remHours > 1 ? 's' : ''}`;
  } else {
    durationText += `${absDiffHours} hr${absDiffHours > 1 ? 's' : ''}`;
  }

  return {
    type: isPostpone ? 'POSTPONE' : 'PREPONE',
    text: isPostpone ? `⏩ Postponed by ${durationText}` : `⏪ Preponed by ${durationText}`,
    diffMs,
  };
}

export default function EditEventModal({ event, onClose, onUpdated, onDeleteRequest, organizerKey }) {
  if (!event) return null;

  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    category: event.category || 'Conference',
    location: event.location || '',
    venue_name: event.venue_name || '',
    capacity: event.capacity || 500,
    banner_url: event.banner_url || '',
    start_date: formatLocalDateTime(event.start_date),
    end_date: formatLocalDateTime(event.end_date),
    currency: event.currency || 'INR',
    country: event.country || 'India',
    city: event.city || '',
    latitude: event.latitude || 12.9716,
    longitude: event.longitude || 77.5946,
  });

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const shiftCalculation = calculateDateShift(event.start_date, formData.start_date);

  // Shift dates helper (Postpone or Prepone by days)
  const applyDateShift = (deltaDays) => {
    const startObj = new Date(formData.start_date);
    const endObj = new Date(formData.end_date);
    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) return;

    const msToAdd = deltaDays * 86400000;
    const newStart = new Date(startObj.getTime() + msToAdd);
    const newEnd = new Date(endObj.getTime() + msToAdd);

    setFormData({
      ...formData,
      start_date: formatLocalDateTime(newStart),
      end_date: formatLocalDateTime(newEnd),
    });
  };

  const resetToOriginalDates = () => {
    setFormData({
      ...formData,
      start_date: formatLocalDateTime(event.start_date),
      end_date: formatLocalDateTime(event.end_date),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Event title is required.');
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (!formData.start_date || isNaN(startDate.getTime())) {
      setError('Please provide a valid start date & time.');
      return;
    }

    if (!formData.end_date || isNaN(endDate.getTime())) {
      setError('Please provide a valid end date & time.');
      return;
    }

    if (endDate <= startDate) {
      setError('Event end date and time must be after the start date and time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeKey = organizerKey || localStorage.getItem('eventpass_organizer_key') || '';

      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-organizer-key': activeKey,
        },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity, 10) || 500,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update event schedule');
      }

      onUpdated(data.event);
      onClose();
    } catch (err) {
      console.error('Update event error:', err);
      setError(err.message || 'Failed to update event');
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
          maxWidth: '720px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
              }}>
                Event Schedule & Details
              </span>
              {shiftCalculation?.type === 'POSTPONE' && (
                <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                  POSTPONING
                </span>
              )}
              {shiftCalculation?.type === 'PREPONE' && (
                <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                  PREPONING
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              Reschedule & Edit Event
            </h2>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Dedicated Postpone / Prepone Quick Action Strip */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 18px',
            marginBottom: '22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#0f172a" />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                  Quick Schedule Controls (Postpone or Prepone)
                </span>
              </div>

              {shiftCalculation && (
                <div style={{
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: shiftCalculation.type === 'POSTPONE' ? '#d97706' : shiftCalculation.type === 'PREPONE' ? '#0369a1' : '#64748b',
                  background: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #e2e8f0',
                }}>
                  {shiftCalculation.text}
                </div>
              )}
            </div>

            <p style={{ fontSize: '12px', color: '#475569', marginBottom: '14px' }}>
              Shift both start and end times together by 1 day or 1 week, or customize manually below:
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => applyDateShift(1)}
                style={{ padding: '6px 12px', fontSize: '12px', background: '#ffffff', borderColor: '#cbd5e1', color: '#d97706' }}
                title="Postpone by +1 Day"
              >
                <FastForward size={13} /> Postpone +1 Day
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => applyDateShift(7)}
                style={{ padding: '6px 12px', fontSize: '12px', background: '#ffffff', borderColor: '#cbd5e1', color: '#d97706' }}
                title="Postpone by +1 Week"
              >
                <FastForward size={13} /> Postpone +1 Week
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => applyDateShift(-1)}
                style={{ padding: '6px 12px', fontSize: '12px', background: '#ffffff', borderColor: '#cbd5e1', color: '#0369a1' }}
                title="Prepone by -1 Day"
              >
                <Rewind size={13} /> Prepone -1 Day
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => applyDateShift(-7)}
                style={{ padding: '6px 12px', fontSize: '12px', background: '#ffffff', borderColor: '#cbd5e1', color: '#0369a1' }}
                title="Prepone by -1 Week"
              >
                <Rewind size={13} /> Prepone -1 Week
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={resetToOriginalDates}
                style={{ padding: '6px 12px', fontSize: '12px', marginLeft: 'auto', background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                title="Reset to Original Dates"
              >
                <RotateCcw size={13} /> Original
              </button>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid-form-2col" style={{ marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                <Calendar size={13} color="#0f172a" />
                Event Start Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                className="input-field"
                style={{ colorScheme: 'light', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                <Calendar size={13} color="#0f172a" />
                Event End Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                className="input-field"
                style={{ colorScheme: 'light', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                min={formData.start_date}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
              />
            </div>
          </div>

          {/* Event Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
              Event Title *
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            />
          </div>

          {/* Category & Capacity */}
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
                Max Capacity
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

          {/* Venue & Location */}
          <div className="grid-form-2col" style={{ marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                Venue Name
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.venue_name}
                onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                City, State / Location
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              />
            </div>
          </div>

          {/* Quick City Presets */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>
              📍 Quick City Presets:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { key: 'bengaluru', label: '🇮🇳 Bengaluru' },
                { key: 'hyderabad', label: '🇮🇳 Hyderabad' },
                { key: 'mumbai', label: '🇮🇳 Mumbai' },
                { key: 'delhi', label: '🇮🇳 Delhi NCR' },
                { key: 'san francisco', label: '🇺🇸 San Francisco' },
              ].map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => handleSelectQuickCity(c.key)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
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

          {/* Currency Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
              Event Billing Currency
            </label>
            <select
              className="select-field"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            >
              {Object.values(SUPPORTED_CURRENCIES).map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.flag} {curr.code} ({curr.symbol}) - {curr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
              Event Description
            </label>
            <textarea
              rows="3"
              className="input-field"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                onClose();
                if (onDeleteRequest) onDeleteRequest(event);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={15} />
              Delete Event
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ padding: '10px 20px' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
