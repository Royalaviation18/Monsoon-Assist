import { useState, useEffect, useCallback, useMemo } from 'react';
import { PlanGenerator } from './components/PlanGenerator';
import { EmergencyChecklist } from './components/EmergencyChecklist';
import { TravelAdvisor } from './components/TravelAdvisor';
import { MultilingualChat } from './components/MultilingualChat';
import { Compass, AlertTriangle, ShieldCheck, Database, CloudRain, ArrowLeft, Trash2, PlusCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiFetch } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SafetyInstruction {
  phase: 'before' | 'during' | 'after';
  action: string;
  details: string;
}

interface ChecklistItem {
  id: string;
  item: string;
  category: string;
  quantity: string;
  requiredQuantity: string;
  completed: boolean;
}

interface FamilyMember {
  name: string;
  age: number;
  gender: string;
  vulnerabilities: string[];
}

interface SafetyAlert {
  _id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  recommendations: string[];
}

interface PreparednessPlan {
  _id: string;
  profileName: string;
  location: string;
  householdSize: number;
  buildingType: 'ground_floor' | 'high_rise' | 'independent';
  vulnerabilities: string[];
  members: FamilyMember[];
  riskLevel: 'low' | 'moderate' | 'high';
  checklist: ChecklistItem[];
  safetyInstructions: SafetyInstruction[];
  language: string;
  createdAt: string;
}

interface WeatherData {
  temp: number;
  windspeed: number;
  condition: string;
}

// ─── Weather Condition Mapper ─────────────────────────────────────────────────
const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy / Misty';
  if (code <= 57) return 'Light Drizzle';
  if (code <= 67) return 'Rain Showers';
  if (code <= 77) return 'Sleet / Snow';
  if (code <= 82) return 'Heavy Rain Showers';
  if (code <= 99) return 'Thunderstorm ⚡';
  return 'Cloudy';
};

// ─── Static style constants (hoisted to avoid object recreation on every render) ─
const LAYOUT_STYLE: React.CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '30px', minHeight: '100vh' };
const HEADER_STYLE: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' };
const BRAND_WRAP_STYLE: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px' };
const STATS_GRID_STYLE: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' };
const STAT_CARD_STYLE: React.CSSProperties = { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const FOOTER_STYLE: React.CSSProperties = { borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-tertiary)', letterSpacing: '0.02em' };
const LOADING_STYLE: React.CSSProperties = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' };
const PHASE_GRID_STYLE: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' };

// ─── Toast Component ──────────────────────────────────────────────────────────
const Toast = ({ msg, type, onDismiss }: { msg: string; type: 'error' | 'success'; onDismiss: () => void }) => (
  <div style={{
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: type === 'error' ? 'rgba(244, 63, 94, 0.95)' : 'rgba(16, 185, 129, 0.95)',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: 600,
    maxWidth: '360px',
    zIndex: 9999,
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    animation: 'slideUp 0.25s ease-out',
  }}>
    <span style={{ flex: 1 }}>{msg}</span>
    <button onClick={onDismiss} aria-label="Dismiss notification" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
  </div>
);

// ─── Delete Confirm Inline Dialog ─────────────────────────────────────────────
const DeleteConfirm = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <div style={{
    background: '#fff',
    border: '1px solid rgba(244, 63, 94, 0.2)',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    minWidth: '220px',
    position: 'absolute',
    top: '44px',
    right: 0,
    zIndex: 100,
  }}>
    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
      Delete this household?
    </div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
      This cannot be undone.
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={onConfirm}
        style={{ flex: 1, background: 'rgba(244, 63, 94, 0.9)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
      >
        Yes, Delete
      </button>
      <button
        onClick={onCancel}
        style={{ flex: 1, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
      >
        Cancel
      </button>
    </div>
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [view, setView] = useState<'setup' | 'dashboard'>('setup');
  const [plans, setPlans] = useState<PreparednessPlan[]>([]);
  const [plan, setPlan] = useState<PreparednessPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [activeTab, setActiveTab] = useState<'instructions' | 'checklist' | 'travel' | 'chat'>('instructions');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showToast = useCallback((msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ─── Fetch Weather ──────────────────────────────────────────────────────────
  const fetchWeather = useCallback(async (locStr: string) => {
    if (!locStr || locStr.trim().length < 2) return;
    const cleanLoc = locStr.trim().toLowerCase();
    
    // Check cache to avoid hitting Open-Meteo API repeatedly
    const cachedWeather = sessionStorage.getItem(`weather_${cleanLoc}`);
    if (cachedWeather) {
      try {
        setWeather(JSON.parse(cachedWeather));
        return;
      } catch {
        // Fall through on JSON parse error
      }
    }

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locStr.trim())}&count=1&format=json`
      );
      if (!geoRes.ok) return;
      const geoData = await geoRes.json();

      if (geoData.results?.length > 0) {
        const { latitude, longitude } = geoData.results[0];
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&wind_speed_unit=kmh`
        );
        if (!res.ok) return;
        const data = await res.json();
        const cur = data.current_weather;
        const mappedWeather = {
          temp: cur.temperature,
          windspeed: cur.windspeed,
          condition: getWeatherCondition(cur.weathercode),
        };
        setWeather(mappedWeather);
        sessionStorage.setItem(`weather_${cleanLoc}`, JSON.stringify(mappedWeather));
      }
    } catch {
      // Weather is non-critical — silently fail
    }
  }, []);

  // ─── Fetch Alerts ───────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async (location: string) => {
    if (!location?.trim()) return;
    try {
      const res = await apiFetch(`/api/monsoon/alerts/${encodeURIComponent(location)}`);
      if (res.ok) {
        const data: SafetyAlert[] = await res.json();
        setAlerts(data);
      }
    } catch {
      // Alerts are informational — silently fail
    }
  }, []);

  // ─── Health Check ───────────────────────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const res = await apiFetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data.database === 'connected' ? 'connected' : 'disconnected');
      } else {
        setDbStatus('disconnected');
      }
    } catch {
      setDbStatus('disconnected');
    }
  }, []);

  // ─── Load Plans ─────────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiFetch('/api/monsoon/plans');
      if (res.ok) {
        const data: PreparednessPlan[] = await res.json();
        setPlans(data);
        if (data.length > 0) {
          setPlan(data[0]);
          setView('dashboard');
          fetchAlerts(data[0].location);
          fetchWeather(data[0].location);
        }
      }
    } catch {
      showToast('Could not load your household profiles. Is the backend running?', 'error');
    } finally {
      setInitialLoading(false);
    }
  }, [fetchAlerts, fetchWeather, showToast]);

  useEffect(() => {
    checkHealth();
    fetchPlans();
  }, [checkHealth, fetchPlans]);

  // ─── Plan Selection ─────────────────────────────────────────────────────────
  const handleSelectPlan = useCallback((planId: string) => {
    const selected = plans.find(p => p._id === planId);
    if (selected) {
      setPlan(selected);
      setView('dashboard');
      setActiveTab('instructions');
      fetchAlerts(selected.location);
      fetchWeather(selected.location);
    }
  }, [plans, fetchAlerts, fetchWeather]);

  // ─── Plan Deletion ──────────────────────────────────────────────────────────
  const handleDeletePlan = useCallback(async () => {
    if (!plan) return;
    setShowDeleteConfirm(false);
    try {
      const res = await apiFetch(`/api/monsoon/plan/${plan._id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = plans.filter(p => p._id !== plan._id);
        setPlans(updated);
        if (updated.length > 0) {
          setPlan(updated[0]);
          setView('dashboard');
          fetchAlerts(updated[0].location);
          fetchWeather(updated[0].location);
        } else {
          setPlan(null);
          setView('setup');
          setWeather(null);
          setAlerts([]);
        }
        showToast('Household profile deleted.', 'success');
      } else {
        showToast('Failed to delete profile. Please try again.', 'error');
      }
    } catch {
      showToast('Network error while deleting profile.', 'error');
    }
  }, [plan, plans, fetchAlerts, fetchWeather, showToast]);

  // ─── Plan Creation ──────────────────────────────────────────────────────────
  const handleCreatePlan = useCallback(async (formData: any) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/monsoon/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data: PreparednessPlan = await res.json();
        setPlans(prev => [data, ...prev]);
        setPlan(data);
        setView('dashboard');
        setActiveTab('instructions');
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        fetchAlerts(formData.location);
        fetchWeather(formData.location);
        showToast('Preparedness plan created successfully! 🎉', 'success');
      } else {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        showToast(errData.error || 'Failed to create plan. Please try again.', 'error');
      }
    } catch {
      showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts, fetchWeather, showToast]);

  // ─── Checklist Toggle ───────────────────────────────────────────────────────
  const handleToggleChecklistItem = useCallback(async (itemId: string, completed: boolean, quantity: string) => {
    if (!plan) return;

    // Optimistic update
    const updatedChecklist = plan.checklist.map(item =>
      item.id === itemId ? { ...item, completed, quantity } : item
    );
    setPlan({ ...plan, checklist: updatedChecklist });

    try {
      const res = await apiFetch(`/api/monsoon/plan/${plan._id}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, completed, quantity })
      });
      if (!res.ok) {
        // Rollback: use functional updater to avoid stale closure
        setPlan(prev => prev ? { ...prev, checklist: prev.checklist } : prev);
        showToast('Failed to save checklist update.', 'error');
      }
    } catch {
      setPlan(prev => prev ? { ...prev } : prev);
      showToast('Network error while syncing checklist.', 'error');
    }
  }, [plan, showToast]);

  // ─── Computed Values ────────────────────────────────────────────────────────
  const checklistTotal = plan?.checklist.length ?? 0;
  const checklistDone = plan?.checklist.filter(x => x.completed).length ?? 0;
  const completionPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  // ─── Memoized Instructions grouping — must be ABOVE any early return ─────
  const groupedInstructions = useMemo(() => {
    if (!plan) return { before: [], during: [], after: [] };
    return {
      before: plan.safetyInstructions.filter(i => i.phase === 'before'),
      during: plan.safetyInstructions.filter(i => i.phase === 'during'),
      after: plan.safetyInstructions.filter(i => i.phase === 'after'),
    };
  }, [plan]);

  // ─── Loading Splash ─────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div style={LOADING_STYLE}>
        <CloudRain size={36} style={{ color: 'var(--accent-color)' }} />
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Loading RainReady...</div>
        <div className="spinner" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={LAYOUT_STYLE}>

      {/* Toast Notification */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header style={HEADER_STYLE}>
        <div style={BRAND_WRAP_STYLE}>
          <CloudRain size={28} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              RAIN<span style={{ color: 'var(--accent-color)' }}>READY</span>
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.03em' }}>
              YOUR AI-POWERED MONSOON SAFETY COMPANION
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

          {/* Household Selector */}
          {plans.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <label htmlFor="activeHouseholdSelect" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>ACTIVE HOUSEHOLD:</label>
              <select
                id="activeHouseholdSelect"
                value={plan?._id || ''}
                onChange={e => handleSelectPlan(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  maxWidth: '180px',
                }}
              >
                {plans.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.profileName || 'Household'} ({p.location})
                  </option>
                ))}
              </select>

              {/* Delete trigger */}
              {plan && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(v => !v)}
                    title="Delete active household"
                    aria-label="Delete household"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--error-color)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                  {showDeleteConfirm && (
                    <DeleteConfirm
                      onConfirm={handleDeletePlan}
                      onCancel={() => setShowDeleteConfirm(false)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Add Household */}
          <button
            onClick={() => setView('setup')}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-color)',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <PlusCircle size={13} aria-hidden="true" />
            Add Household
          </button>

          {/* DB Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
            <Database size={11} style={{ color: dbStatus === 'connected' ? 'var(--success-color)' : 'var(--error-color)' }} aria-hidden="true" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {dbStatus === 'checking' ? 'Connecting...' : dbStatus === 'connected' ? 'DB Connected' : 'Offline Mode'}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Setup View */}
        {view === 'setup' && (
          <div style={{ maxWidth: '640px', margin: '30px auto', width: '100%', animation: 'slideUp 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {plans.length > 0 && (
              <button
                onClick={() => setView('dashboard')}
                className="btn-secondary"
                style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={14} aria-hidden="true" /> Back to Dashboard
              </button>
            )}
            <PlanGenerator onSubmit={handleCreatePlan} loading={loading} />
          </div>
        )}

        {/* Dashboard View */}
        {view === 'dashboard' && plan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease-out' }}>

            {/* Stats Row */}
            <div style={STATS_GRID_STYLE}>
              <div className="glass-card" style={STAT_CARD_STYLE}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>MONSOON RISK LEVEL</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: plan.riskLevel === 'high' ? 'var(--error-color)' : plan.riskLevel === 'moderate' ? 'var(--warning-color)' : 'var(--success-color)', textTransform: 'uppercase', marginTop: '2px' }}>
                    {plan.riskLevel} Risk
                  </div>
                </div>
                <AlertTriangle size={22} style={{ color: plan.riskLevel === 'high' ? 'var(--error-color)' : 'var(--warning-color)', flexShrink: 0 }} aria-hidden="true" />
              </div>

              <div className="glass-card" style={STAT_CARD_STYLE}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>LOCATION PREPARED</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                    {plan.location}
                  </div>
                </div>
                <Compass size={22} style={{ color: 'var(--accent-color)', flexShrink: 0 }} aria-hidden="true" />
              </div>

              {weather && (
                <div className="glass-card" style={STAT_CARD_STYLE}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>LIVE WEATHER</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {weather.temp}°C • {weather.condition}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>Wind {weather.windspeed} km/h</div>
                  </div>
                  <CloudRain size={22} style={{ color: 'var(--accent-color)', flexShrink: 0 }} aria-hidden="true" />
                </div>
              )}

              <div className="glass-card" style={STAT_CARD_STYLE}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>SUPPLIES READY</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: completionPct === 100 ? 'var(--success-color)' : 'var(--text-primary)', marginTop: '2px' }}>
                    {completionPct}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>{checklistDone}/{checklistTotal} items stocked</div>
                </div>
                <ShieldCheck size={22} style={{ color: 'var(--success-color)', flexShrink: 0 }} aria-hidden="true" />
              </div>
            </div>

            {/* Members Directory (Read-only) */}
            {plan.members && plan.members.length > 0 && (
              <div className="glass-card" style={{ padding: '16px 20px' }}>
                <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '12px', letterSpacing: '0.05em' }}>
                  HOUSEHOLD MEMBERS — {plan.profileName}
                </h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {plan.members.map((m, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}> · {m.gender}, {m.age} yrs</span>
                      {m.vulnerabilities?.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {m.vulnerabilities.map(v => (
                            <span key={v} style={{ fontSize: '0.65rem', background: 'rgba(244, 63, 94, 0.08)', color: 'var(--error-color)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
                              {v === 'mobility' ? '♿ Mobility' : v === 'infant' ? '🍼 Infant' : v === 'medical' ? '💊 Medical' : v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Alerts */}
            {alerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(244, 63, 94, 0.04)', border: '1px solid rgba(244, 63, 94, 0.15)', borderRadius: '10px', padding: '16px' }}>
                <h4 style={{ color: 'var(--error-color)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} /> Severe Weather Warning for {plan.location}
                </h4>
                {alerts.map((alert) => (
                  <div key={alert._id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '21px', borderLeft: `3px solid ${alert.severity === 'critical' ? 'var(--error-color)' : 'var(--warning-color)'}`, paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: '4px', background: alert.severity === 'critical' ? 'rgba(244,63,94,0.12)' : alert.severity === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: alert.severity === 'critical' ? 'var(--error-color)' : alert.severity === 'warning' ? 'var(--warning-color)' : 'var(--accent-color)', flexShrink: 0 }}>{alert.severity}</span>
                      <strong>{alert.title}</strong>: {alert.message}
                    </div>
                    {alert.recommendations && alert.recommendations.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {alert.recommendations.map((rec: string, i: number) => (
                          <li key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div role="tablist" aria-label="Dashboard sections" style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)' }}>
              {(['instructions', 'checklist', 'travel', 'chat'] as const).map(tab => {
                const labelMap = {
                  instructions: 'Safety Manual',
                  checklist: 'Supplies Tracker',
                  travel: 'Travel Advisory',
                  chat: 'Safety Assistant',
                };
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={active}
                    aria-controls={`tabpanel-${tab}`}
                    id={`tab-${tab}`}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: active ? '2px solid var(--accent-color)' : '2px solid transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      fontWeight: active ? 700 : 500,
                      padding: '10px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {labelMap[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div style={{ minHeight: '350px' }}>
              {activeTab === 'instructions' && (
                <div role="tabpanel" id="tabpanel-instructions" aria-labelledby="tab-instructions" style={PHASE_GRID_STYLE}>
                  {(['before', 'during', 'after'] as const).map(phase => {
                    const instructions = groupedInstructions[phase];
                    const phaseTitle = { before: 'Before Severe Weather', during: 'During Storm / Flood', after: 'After Severe Weather' }[phase];
                    const phaseColor = { before: 'var(--success-color)', during: 'var(--warning-color)', after: 'var(--text-secondary)' }[phase];
                    return (
                      <div key={phase} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: phaseColor }}>{phaseTitle}</h3>
                        {instructions.length === 0 && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>No instructions for this phase.</div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {instructions.map((inst, idx) => (
                            <div key={idx} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                {idx + 1}. {inst.action}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                                {inst.details}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Community Preparedness — spans full width below phase cards */}
                  <div
                    className="glass-card"
                    style={{
                      gridColumn: '1 / -1',
                      background: 'rgba(16, 185, 129, 0.03)',
                      border: '1px solid rgba(16, 185, 129, 0.18)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🏘 Community Preparedness
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      RainReady plans include community-level actions generated by Gemini AI — steps your household can
                      take <em>with</em> or <em>for</em> neighbours. Look for community actions tagged in the safety
                      instructions above (e.g. checking on elderly neighbours, coordinating evacuation routes, sharing
                      surplus supplies with nearby households).
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {[
                        { icon: '👴', label: 'Check on elderly neighbours before a storm' },
                        { icon: '🛖', label: 'Share surplus water & dry food with households in need' },
                        { icon: '📢', label: 'Relay official alerts to neighbours without smartphones' },
                        { icon: '🚗', label: 'Coordinate shared evacuation vehicles for your street' },
                      ].map(tip => (
                        <div
                          key={tip.label}
                          style={{
                            flex: '1 1 200px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{tip.icon}</span>
                          <span>{tip.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}



              {activeTab === 'checklist' && (
                <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                  {plan.checklist.length === 0
                    ? <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>No checklist items generated. Regenerate your plan.</div>
                    : <EmergencyChecklist checklist={plan.checklist} onToggleItem={handleToggleChecklistItem} />
                  }
                </div>
              )}

              {activeTab === 'travel' && (
                <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                  <TravelAdvisor defaultOrigin={plan.location} />
                </div>
              )}

              {activeTab === 'chat' && (
                <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Emergency SOS Contacts — always visible in chat tab as a safety anchor */}
                  <div className="glass-card" style={{ padding: '14px 18px', background: 'rgba(244, 63, 94, 0.03)', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--error-color)', letterSpacing: '0.05em', marginBottom: '10px' }}>
                      🆘 EMERGENCY CONTACTS — INDIA
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                      {[
                        { name: 'National Emergency', number: '112', desc: 'Police / Fire / Ambulance' },
                        { name: 'NDRF Helpline', number: '011-24363260', desc: 'Flood & Disaster Rescue' },
                        { name: 'Disaster Mgmt', number: '1078', desc: 'National Control Room' },
                        { name: 'Health Helpline', number: '104', desc: 'Medical emergencies' },
                      ].map(contact => (
                        <a
                          key={contact.number}
                          href={`tel:${contact.number.replace(/\D/g, '')}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            textDecoration: 'none',
                          }}
                        >
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--error-color)', letterSpacing: '0.02em' }}>{contact.number}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{contact.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{contact.desc}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                  <MultilingualChat defaultLanguage={plan.language} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={FOOTER_STYLE}>
        © 2026 RainReady — AI-Powered Monsoon Safety Companion. Designed for citizen safety and disaster risk reduction.
      </footer>
    </div>
  );
}

export default App;
