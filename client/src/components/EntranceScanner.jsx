import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, CameraOff, Volume2, VolumeX, ShieldCheck, AlertTriangle, 
  XCircle, CheckCircle2, RefreshCw, Smartphone, Key, History, Zap, Sparkles 
} from 'lucide-react';
import { playSuccessChime, playDuplicateWarning, playErrorBuzzer } from '../utils/audio';

export default function EntranceScanner({ events, initialEventId, initialTestCode }) {
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || events[0]?.id || '');
  const [doorName, setDoorName] = useState('Main Gate A - VIP Fastlane');
  const [volunteerName, setVolunteerName] = useState('Volunteer Entrance Staff');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraList, setCameraList] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  
  // Verification outcome state
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { status, title, message, ticket }
  const [manualCode, setManualCode] = useState(initialTestCode || '');
  const [scanHistory, setScanHistory] = useState([]);

  const html5QrCodeRef = useRef(null);
  const resultTimeoutRef = useRef(null);

  // Update selected event if changed externally
  useEffect(() => {
    if (initialEventId) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId]);

  // If initial test code was passed, populate manual code
  useEffect(() => {
    if (initialTestCode) {
      setManualCode(initialTestCode);
    }
  }, [initialTestCode]);

  // Load available camera devices
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameraList(devices);
        // Default to back/environment camera if found
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
      }
    }).catch(err => {
      console.warn('Could not enumerate cameras:', err);
    });

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (cameraIdToUse) => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
      }

      const cameraId = cameraIdToUse || selectedCameraId;
      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const cameraParam = cameraId ? cameraId : { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraParam,
        config,
        (decodedText) => {
          handleVerify(decodedText);
        },
        (error) => {
          // Frame decode pass (silent)
        }
      );

      setScanning(true);
    } catch (err) {
      console.error('Camera start error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions or use the quick test codes below.');
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Camera stop error:', err);
      }
      setScanning(false);
    }
  };

  const handleCameraToggle = () => {
    if (scanning) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Perform ticket verification
  const handleVerify = async (codeOrToken) => {
    if (verifying || !codeOrToken) return;

    setVerifying(true);
    // Pause temporary camera detection while showing result
    if (html5QrCodeRef.current && scanning) {
      try {
        html5QrCodeRef.current.pause(true);
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/scan/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeOrToken: codeOrToken.trim(),
          eventId: selectedEventId,
          doorName,
          volunteerName,
        }),
      });

      const data = await res.json();
      setScanResult(data);

      // Play audio feedback
      if (soundEnabled) {
        if (data.status === 'SUCCESS') {
          playSuccessChime();
        } else if (data.status === 'DUPLICATE') {
          playDuplicateWarning();
        } else {
          playErrorBuzzer();
        }
      }

      // Append to scan history
      setScanHistory(prev => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          code: data.ticket?.ticket_code || codeOrToken.slice(0, 15),
          name: data.ticket?.attendee_name || 'Unknown',
          tier: data.ticket?.tier_name || 'N/A',
          status: data.status,
          title: data.title,
        },
        ...prev.slice(0, 9),
      ]);

      // Auto dismiss result after 3.5 seconds to resume scanner
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = setTimeout(() => {
        dismissResult();
      }, 4000);

    } catch (err) {
      console.error('Scan error:', err);
      setScanResult({
        status: 'ERROR',
        title: 'Connection Error',
        message: 'Could not connect to verification server. Please retry.',
      });
      if (soundEnabled) playErrorBuzzer();
    } finally {
      setVerifying(false);
    }
  };

  const dismissResult = () => {
    setScanResult(null);
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    if (html5QrCodeRef.current && scanning) {
      try {
        html5QrCodeRef.current.resume();
      } catch (e) {}
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleVerify(manualCode.trim());
  };

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  return (
    <div className="page-container">
      {/* Top Banner & Control Deck */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '24px 28px',
        marginBottom: '28px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '3px 9px',
                borderRadius: '6px',
                background: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                Mobile-Optimized Entrance
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Doorbell Check-In Station</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
              Entrance Camera Scanner
            </h1>
          </div>

          {/* Sound & Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn-secondary"
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
              }}
              title="Toggle Audio Feedback"
            >
              {soundEnabled ? <Volume2 size={16} color="#059669" /> : <VolumeX size={16} color="#dc2626" />}
              <span>{soundEnabled ? 'Audio Chimes Active' : 'Muted'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginTop: '20px',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '20px',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
              Active Event
            </label>
            <select
              className="select-field"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
              Entrance Gate / Turnstile
            </label>
            <select
              className="select-field"
              value={doorName}
              onChange={(e) => setDoorName(e.target.value)}
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            >
              <option value="Main Gate A - VIP Fastlane">Main Gate A - VIP Fastlane</option>
              <option value="Gate B - North Turnstiles">Gate B - North Turnstiles</option>
              <option value="Gate C - Student & General">Gate C - Student & General</option>
              <option value="West Turnstile Entrance">West Turnstile Entrance</option>
              <option value="South Auditorium Doors">South Auditorium Doors</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
              Volunteer / Staff Operator
            </label>
            <input
              type="text"
              className="input-field"
              value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)}
              placeholder="e.g. Volunteer Sarah"
              style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Camera Scanner + Quick Test Simulators */}
      <div className="grid-scanner-responsive">
        {/* Left Column: Camera Viewfinder */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '24px',
          position: 'relative',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          {/* Camera Viewfinder Box */}
          <div className="scanner-viewfinder" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="qr-reader-container" style={{ width: '100%', height: '100%', minHeight: '340px' }} />

            {scanning && (
              <>
                <div className="scanner-laser" />
                <div className="scanner-reticle" />
              </>
            )}

            {!scanning && (
              <div style={{
                textAlign: 'center',
                padding: '36px 20px',
                zIndex: 10,
                background: '#f8fafc',
                borderRadius: '16px',
                width: '100%',
                border: '1px dashed #cbd5e1',
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                }}>
                  <Camera size={28} color="#0f172a" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                  Camera Ready for Check-In
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', maxWidth: '340px', margin: '0 auto 20px', lineHeight: '1.4' }}>
                  Activate your device camera to scan attendees' cryptographically signed QR passes.
                </p>
                <button className="btn-primary" onClick={handleCameraToggle} style={{ padding: '10px 22px', fontSize: '13px' }}>
                  <Camera size={15} /> Start Entrance Camera
                </button>
              </div>
            )}

            {/* Verification Result Overlay Banner */}
            {scanResult && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 40,
                  background: scanResult.status === 'SUCCESS'
                    ? 'radial-gradient(circle, rgba(16, 185, 129, 0.98) 0%, rgba(6, 78, 59, 0.98) 100%)'
                    : scanResult.status === 'DUPLICATE'
                    ? 'radial-gradient(circle, rgba(245, 158, 11, 0.98) 0%, rgba(146, 64, 14, 0.98) 100%)'
                    : 'radial-gradient(circle, rgba(239, 68, 68, 0.98) 0%, rgba(153, 27, 27, 0.98) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '30px',
                  textAlign: 'center',
                  color: '#ffffff',
                  borderRadius: '24px',
                  animation: 'fade-in 0.15s ease-out',
                }}
              >
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 0 30px rgba(255, 255, 255, 0.3)',
                }}>
                  {scanResult.status === 'SUCCESS' && <CheckCircle2 size={44} color="#ffffff" strokeWidth={2.5} />}
                  {scanResult.status === 'DUPLICATE' && <AlertTriangle size={44} color="#ffffff" strokeWidth={2.5} />}
                  {scanResult.status !== 'SUCCESS' && scanResult.status !== 'DUPLICATE' && <XCircle size={44} color="#ffffff" strokeWidth={2.5} />}
                </div>

                <div style={{
                  fontSize: '12px',
                  fontWeight: '800',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  marginBottom: '8px',
                }}>
                  {scanResult.status}
                </div>

                <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>
                  {scanResult.title}
                </h2>

                <p style={{ fontSize: '14px', maxWidth: '380px', marginBottom: '20px', lineHeight: '1.4', opacity: 0.95 }}>
                  {scanResult.message}
                </p>

                {scanResult.ticket && (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    marginBottom: '20px',
                    fontSize: '13px',
                  }}>
                    <div>Attendee: <strong>{scanResult.ticket.attendee_name}</strong></div>
                    <div>Pass: <strong>{scanResult.ticket.tier_name}</strong> • Code: <code>{scanResult.ticket.ticket_code}</code></div>
                  </div>
                )}

                <button
                  onClick={dismissResult}
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 24px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Next Scan (Auto in 3s)
                </button>
              </div>
            )}
          </div>

          {/* Camera controls bottom bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className={scanning ? "btn-danger" : "btn-primary"}
                onClick={handleCameraToggle}
                style={{ padding: '8px 16px', fontSize: '12.5px' }}
              >
                {scanning ? <CameraOff size={15} /> : <Camera size={15} />}
                <span>{scanning ? 'Stop Camera' : 'Start Camera'}</span>
              </button>

              {cameraList.length > 1 && (
                <select
                  className="select-field"
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    if (scanning) {
                      stopCamera().then(() => startCamera(e.target.value));
                    }
                  }}
                  style={{ padding: '8px 30px 8px 12px', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                >
                  {cameraList.map(c => (
                    <option key={c.id} value={c.id}>{c.label || 'Camera'}</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>
              {scanning ? '🟢 Viewfinder Active' : 'Standby'}
            </div>
          </div>

          {/* Manual Code Input Bar */}
          <form onSubmit={handleManualSubmit} style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
              Manual Code Lookup (Damaged Phone / Sunlight Fallback)
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter Ticket Code (e.g. EP-VIP-1001) or paste JWT token"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={verifying || !manualCode.trim()}
                style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}
              >
                Verify Code
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: 1-Click Test Scenarios & History */}
        <div>
          {/* Quick Test Simulator Drawer */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '22px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} color="#d97706" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                Instant Security Simulation
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px', lineHeight: '1.4' }}>
              Test fraud prevention and entrance rules in 1 click without needing to print paper passes:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="btn-secondary"
                onClick={() => handleVerify('EP-VIP-2026')}
                style={{
                  justifyContent: 'flex-start',
                  padding: '10px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #059669',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>🟢 Valid VIP Pass</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>EP-VIP-2026 (Liam O’Connor)</div>
                </div>
              </button>

              <button
                className="btn-secondary"
                onClick={() => handleVerify('EP-GEN-2002')}
                style={{
                  justifyContent: 'flex-start',
                  padding: '10px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #059669',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>🟢 Valid General Pass</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>EP-GEN-2002 (Aaliyah Washington)</div>
                </div>
              </button>

              <button
                className="btn-secondary"
                onClick={() => handleVerify('EP-VIP-1001')}
                style={{
                  justifyContent: 'flex-start',
                  padding: '10px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #d97706',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>🟡 Duplicate / Already Admitted</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>EP-VIP-1001 (Already checked in)</div>
                </div>
              </button>

              <button
                className="btn-secondary"
                onClick={() => handleVerify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmb3JnZWRfdGlja2V0IiwiY29kZSI6IkZPUkdFRCIsImVpZCI6ImV2dF9haV9zdW1taXRfMjAyNiJ9.TAMPERED_INVALID_SIGNATURE_BYTES')}
                style={{
                  justifyContent: 'flex-start',
                  padding: '10px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #dc2626',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>🔴 Tampered / Forged Signature</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>Simulates corrupted / counterfeited JWT</div>
                </div>
              </button>

              <button
                className="btn-secondary"
                onClick={() => handleVerify('EP-GEN-REVOKED')}
                style={{
                  justifyContent: 'flex-start',
                  padding: '10px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #dc2626',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>🔴 Revoked Pass</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>EP-GEN-REVOKED (Devon Vance)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Entrance Scan History */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <History size={15} color="#0f172a" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                Door Scan Activity ({scanHistory.length})
              </h3>
            </div>

            {scanHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b', fontSize: '12px' }}>
                No scans recorded at this station yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {scanHistory.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.name}</div>
                      <div style={{ color: '#64748b', fontSize: '11px' }}>{item.code} • {item.time}</div>
                    </div>
                    <div>
                      {item.status === 'SUCCESS' && <span className="badge-status-valid" style={{ fontSize: '10px' }}>GRANTED</span>}
                      {item.status === 'DUPLICATE' && <span style={{ color: '#d97706', fontWeight: '700', fontSize: '10px' }}>DUPLICATE</span>}
                      {item.status !== 'SUCCESS' && item.status !== 'DUPLICATE' && <span className="badge-status-revoked" style={{ fontSize: '10px' }}>DENIED</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
