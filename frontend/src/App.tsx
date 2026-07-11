import { useState, useEffect } from 'react';
import { PlanGenerator } from './components/PlanGenerator';
import { EmergencyChecklist } from './components/EmergencyChecklist';
import { TravelAdvisor } from './components/TravelAdvisor';
import { MultilingualChat } from './components/MultilingualChat';
import { Compass, AlertTriangle, ShieldCheck, Database, CloudRain, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SafetyInstruction {
  phase: 'before' | 'during' | 'after';
  action: string;
  details: string;
}

interface PreparednessPlan {
  _id: string;
  profileName: string;
  location: string;
  householdSize: number;
  buildingType: 'ground_floor' | 'high_rise' | 'independent';
  vulnerabilities: string[];
  members: any[];
  riskLevel: 'low' | 'moderate' | 'high';
  checklist: any[];
  safetyInstructions: SafetyInstruction[];
  language: string;
  createdAt: string;
}

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  mumbai: { lat: 19.0760, lon: 72.8777 },
  pune: { lat: 18.5204, lon: 73.8567 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  delhi: { lat: 28.7041, lon: 77.1025 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kerala: { lat: 10.8505, lon: 76.2711 }
};

function App() {
  const [view, setView] = useState<'setup' | 'dashboard'>('setup');
  const [plans, setPlans] = useState<PreparednessPlan[]>([]);
  const [plan, setPlan] = useState<PreparednessPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [activeTab, setActiveTab] = useState<'instructions' | 'checklist' | 'travel' | 'chat'>('instructions');
  
  // Theme & Weather States
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [weather, setWeather] = useState<{ temp: number; windspeed: number; condition: string } | null>(null);

  // Toggle Theme class
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  // Verify health status, connection, and fetch existing plans
  useEffect(() => {
    checkHealth();
    fetchPlans();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setDbStatus(data.database === 'connected' ? 'connected' : 'disconnected');
      } else {
        setDbStatus('disconnected');
      }
    } catch {
      setDbStatus('disconnected');
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/monsoon/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        if (data.length > 0) {
          setPlan(data[0]);
          setView('dashboard');
          fetchAlerts(data[0].location);
          fetchWeather(data[0].location);
        }
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const handleSelectPlan = (planId: string) => {
    const selected = plans.find(p => p._id === planId);
    if (selected) {
      setPlan(selected);
      setView('dashboard');
      fetchAlerts(selected.location);
      fetchWeather(selected.location);
    }
  };

  const fetchWeather = async (locStr: string) => {
    const key = locStr.toLowerCase().trim();
    let coords = CITY_COORDS[key];
    
    // Fallback search
    if (!coords) {
      const matchingKey = Object.keys(CITY_COORDS).find(k => key.includes(k));
      coords = matchingKey ? CITY_COORDS[matchingKey] : CITY_COORDS['mumbai'];
    }

    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`);
      if (res.ok) {
        const data = await res.json();
        const cur = data.current_weather;
        setWeather({
          temp: cur.temperature,
          windspeed: cur.windspeed,
          condition: cur.weathercode >= 51 ? 'Heavy Rain' : 'Light Drizzle / Cloudy'
        });
      }
    } catch (err) {
      console.warn('Weather API failed:', err);
    }
  };

  const handleCreatePlan = async (formData: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/monsoon/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(prev => [data, ...prev]);
        setPlan(data);
        setView('dashboard');
        confetti(); // Celebratory effect on plan creation success
        
        // Fetch alerts & live weather
        fetchAlerts(formData.location);
        fetchWeather(formData.location);
      }
    } catch (err) {
      console.error('Plan creation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async (location: string) => {
    try {
      const res = await fetch(`/api/monsoon/alerts/${location}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  const handleToggleChecklistItem = async (itemId: string, completed: boolean, quantity: string) => {
    if (!plan) return;

    // Optimistic Update
    const updatedChecklist = plan.checklist.map(item =>
      item.id === itemId ? { ...item, completed, quantity } : item
    );
    setPlan({ ...plan, checklist: updatedChecklist });

    try {
      await fetch(`/api/monsoon/plan/${plan._id}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, completed, quantity })
      });
    } catch (err) {
      console.error('Checklist sync failed:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '30px', minHeight: '100vh' }}>
      
      {/* Header bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CloudRain size={28} style={{ color: 'var(--accent-color)' }} />
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              MONSOON<span style={{ color: 'var(--accent-color)' }}>ASSIST</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>GENAI EMERGENCY PREPAREDNESS</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Family Profiles Dropdown */}
          {plans.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>ACTIVE FAMILY:</span>
              <select
                value={plan?._id || ''}
                onChange={(e) => handleSelectPlan(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  width: 'auto',
                  cursor: 'pointer'
                }}
              >
                {plans.map(p => (
                  <option key={p._id} value={p._id}>{p.profileName} ({p.location})</option>
                ))}
              </select>
            </div>
          )}

          {/* New Profile button */}
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
              gap: '4px'
            }}
          >
            + Add Household
          </button>

          {/* Theme switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {theme === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode'}
          </button>
          
          {/* Database Health Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
            <Database size={12} style={{ color: dbStatus === 'connected' ? 'var(--success-color)' : 'var(--error-color)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              DB: {dbStatus === 'checking' ? 'Connecting...' : dbStatus === 'connected' ? 'Atlas Connected' : 'Offline Mode'}
            </span>
          </div>
        </div>
      </header>

      {/* Main body content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {view === 'setup' && (
          <div style={{ maxWidth: '640px', margin: '30px auto', width: '100%', animation: 'slideUp 0.3s ease-out' }}>
            <PlanGenerator onSubmit={handleCreatePlan} loading={loading} />
          </div>
        )}

        {view === 'dashboard' && plan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease-out' }}>
            
            {/* Top Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>MONSOON RISK LEVEL</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: plan.riskLevel === 'high' ? 'var(--error-color)' : 'var(--warning-color)', textTransform: 'uppercase', marginTop: '2px' }}>
                    {plan.riskLevel} Risk
                  </div>
                </div>
                <AlertTriangle size={24} style={{ color: plan.riskLevel === 'high' ? 'var(--error-color)' : 'var(--warning-color)' }} />
              </div>

              <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>LOCATION PREPARED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {plan.location}
                  </div>
                </div>
                <Compass size={24} style={{ color: 'var(--accent-color)' }} />
              </div>

              {weather && (
                <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>LIVE WEATHER</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 850, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {weather.temp}°C • {weather.condition}
                    </div>
                  </div>
                  <CloudRain size={24} style={{ color: 'var(--accent-color)' }} />
                </div>
              )}

              <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>SUPPLIES READY</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success-color)', marginTop: '2px' }}>
                    {Math.round((plan.checklist.filter(x => x.completed).length / plan.checklist.length) * 100)}%
                  </div>
                </div>
                <ShieldCheck size={24} style={{ color: 'var(--success-color)' }} />
              </div>
            </div>

            {/* Back Button */}
            <div>
              <button onClick={() => setView('setup')} className="btn-secondary">
                <ArrowLeft size={14} /> Back to Config Profile
              </button>
            </div>

            {/* Active alerts display */}
            {alerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.15)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ color: 'var(--error-color)', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} /> Severe Weather Warning for {plan.location}
                </h4>
                {alerts.map((alert, idx) => (
                  <div key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                    <strong>{alert.title}</strong>: {alert.message}
                  </div>
                ))}
              </div>
            )}

            {/* Sub-panel Tab Navs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '1px' }}>
              {(['instructions', 'checklist', 'travel', 'chat'] as const).map(tab => {
                const labelMap = {
                  instructions: 'Personalized Manual',
                  checklist: 'Survival Checklist',
                  travel: 'Travel Advisory',
                  chat: 'Emergency QA Bot'
                };
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: active ? '2px solid var(--accent-color)' : '2px solid transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      padding: '10px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {labelMap[tab]}
                  </button>
                );
              })}
            </div>

            {/* Sub-panels display */}
            <div style={{ minHeight: '350px' }}>
              {activeTab === 'instructions' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {(['before', 'during', 'after'] as const).map(phase => {
                    const instructions = plan.safetyInstructions.filter(i => i.phase === phase);
                    const phaseTitle = phase === 'before' ? 'Before Severe Weather' : phase === 'during' ? 'During Storm/Flood' : 'After Severe Weather';
                    const phaseColor = phase === 'before' ? 'var(--success-color)' : phase === 'during' ? 'var(--warning-color)' : 'var(--text-secondary)';
                    
                    return (
                      <div key={phase} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: phaseColor }}>{phaseTitle}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {instructions.map((inst, idx) => (
                            <div key={idx} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {idx + 1}. {inst.action}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {inst.details}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'checklist' && (
                <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                  <EmergencyChecklist
                    checklist={plan.checklist}
                    onToggleItem={handleToggleChecklistItem}
                  />
                </div>
              )}

              {activeTab === 'travel' && (
                <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                  <TravelAdvisor />
                </div>
              )}

              {activeTab === 'chat' && (
                <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                  <MultilingualChat />
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Footer bar */}
      <footer style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
        © 2026 Monsoon Assist. Designed for citizen safety and disaster risk reduction.
      </footer>
    </div>
  );
}

export default App;
