import React, { useState, useEffect } from 'react';
import { ShieldAlert, Home, ChevronRight, MapPin } from 'lucide-react';

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'];



interface PlanGeneratorProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

export const PlanGenerator: React.FC<PlanGeneratorProps> = ({ onSubmit, loading }) => {
  const [profileName, setProfileName] = useState('My Home');
  const [location, setLocation] = useState('Mumbai');
  const [buildingType, setBuildingType] = useState<'ground_floor' | 'high_rise' | 'independent'>('ground_floor');
  const [language, setLanguage] = useState('English');
  const [detecting, setDetecting] = useState(false);
  const [localWeather, setLocalWeather] = useState<{ temp: number; condition: string } | null>(null);

  // Dynamic Family Members List
  const [members, setMembers] = useState<Array<{ name: string; age: number; gender: string; vulnerabilities: string[] }>>([
    { name: 'Self', age: 28, gender: 'Male', vulnerabilities: [] }
  ]);

  // Member Input States
  const [mName, setMName] = useState('');
  const [mAge, setMAge] = useState('30');
  const [mGender, setMGender] = useState('Male');
  const [mVuln, setMVuln] = useState<string[]>([]);

  const handleAgeChange = (val: string) => {
    // Strips any non-digit character (blocking -, ., e, etc.)
    setMAge(val.replace(/\D/g, ''));
  };

  // Auto-detect location on load
  useEffect(() => {
    const fetchGeoLocation = async () => {
      // Check cache first
      const cached = sessionStorage.getItem('detected_city');
      if (cached) {
        setLocation(cached);
        return;
      }

      setDetecting(true);
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.city) {
            setLocation(data.city);
            sessionStorage.setItem('detected_city', data.city);
          }
        }
      } catch (err) {
        console.warn('Geolocation auto-detect failed, using default.', err);
      } finally {
        setDetecting(false);
      }
    };
    fetchGeoLocation();
  }, []);

  // Fetch local weather when location changes
  useEffect(() => {
    const fetchLocalWeather = async () => {
      const key = location.trim();
      if (key.length < 2) return;
      
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(key)}&count=1&format=json`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            const { latitude, longitude } = geoData.results[0];
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            if (res.ok) {
              const data = await res.json();
              const cur = data.current_weather;
              setLocalWeather({
                temp: cur.temperature,
                condition: cur.weathercode >= 51 ? 'Heavy Rain' : 'Light Drizzle / Cloudy'
              });
              return;
            }
          }
        }

        // Default Fallback
        setLocalWeather({ temp: 28, condition: 'Cloudy' });
      } catch (err) {
        console.warn('Home page weather fetch failed:', err);
      }
    };

    // Debounce the typing action by 500ms
    const timer = setTimeout(fetchLocalWeather, 500);
    return () => clearTimeout(timer);
  }, [location]);

  const addMember = () => {
    if (!mName.trim()) return;
    const parsedAge = parseInt(mAge, 10);
    const finalAge = isNaN(parsedAge) ? 0 : Math.max(0, parsedAge);
    setMembers(prev => [...prev, {
      name: mName.trim(),
      age: finalAge,
      gender: mGender,
      vulnerabilities: mVuln
    }]);
    setMName('');
    setMAge('30');
    setMGender('Male');
    setMVuln([]);
  };

  const removeMember = (index: number) => {
    setMembers(prev => prev.filter((_, i) => i !== index));
  };

  const toggleMemberVuln = (v: string) => {
    setMVuln(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedProfileName = profileName.trim();
    const trimmedLocation = location.trim();

    if (trimmedProfileName.length < 2 || trimmedLocation.length < 2) {
      return;
    }

    if (members.length === 0) {
      alert("Please add at least one household member.");
      return;
    }

    onSubmit({
      profileName: trimmedProfileName,
      location: trimmedLocation,
      householdSize: members.length,
      buildingType,
      vulnerabilities: Array.from(new Set(members.flatMap(m => m.vulnerabilities))),
      members,
      language
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={24} style={{ color: 'var(--accent-color)' }} />
          Get Preparedness Plan
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Configure household details to let Generative AI structure safety instructions and custom survival supplies.
        </p>
      </div>

      {localWeather && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.04)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.05em' }}>LIVE MONSOON WEATHER FOR {location.toUpperCase()}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {localWeather.temp}°C • {localWeather.condition}
            </div>
          </div>
          <MapPin size={20} style={{ color: 'var(--accent-color)' }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Profile Name */}
        <div>
          <label htmlFor="profileNameInput" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            HOUSEHOLD PROFILE NAME
          </label>
          <input
            id="profileNameInput"
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="e.g. My Flat, Grandfather's House"
            required
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="locationInput" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <span>LOCATION / CITY</span>
            {detecting && <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 500 }}>Detecting...</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="locationInput"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mumbai, Bokaro"
              style={{ paddingLeft: '34px' }}
              required
            />
            <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          </div>
        </div>
      </div>

      {/* Building Layout */}
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          BUILDING OR HOME TYPE
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {(['ground_floor', 'high_rise', 'independent'] as const).map((type) => {
            const labelMap = {
              ground_floor: 'Ground Floor Apartment',
              high_rise: 'High-Rise Flat',
              independent: 'Independent House'
            };
            const descMap = {
              ground_floor: 'Vulnerable to water logging & runoff',
              high_rise: 'Vulnerable to wind & power outages',
              independent: 'Vulnerable to roof leaks & drainage'
            };
            const active = buildingType === type;
            return (
              <button
                type="button"
                key={type}
                onClick={() => setBuildingType(type)}
                style={{
                  background: active ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-tertiary)',
                  border: active ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {labelMap[type]}
                  </span>
                  {active && <Home size={14} style={{ color: 'var(--accent-color)' }} />}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{descMap[type]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Family Directory Header */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Family Directory ({members.length} members)
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          Add details of the family members living in this household to customize emergency checklist quotas.
        </p>
      </div>

      {/* Current Members Grid */}
      {members.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {members.map((m, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                position: 'relative'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{m.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {m.gender}, {m.age} years old
              </div>
              {m.vulnerabilities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                  {m.vulnerabilities.map(v => (
                    <span key={v} style={{ fontSize: '0.65rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--error-color)', padding: '1px 5px', borderRadius: '4px' }}>
                      {v === 'mobility' ? 'Mobility Support' : v === 'infant' ? 'Infant' : v === 'medical' ? 'Medical Support' : v}
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => removeMember(idx)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--error-color)',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Subform */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ADD FAMILY MEMBER</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          <div>
            <label htmlFor="mNameInput" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>NAME</label>
            <input
              id="mNameInput"
              type="text"
              value={mName}
              onChange={(e) => setMName(e.target.value)}
              placeholder="e.g. Grandfather, Sister"
              style={{ padding: '8px 10px', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label htmlFor="mAgeInput" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>AGE</label>
            <input
              id="mAgeInput"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={mAge}
              onChange={(e) => handleAgeChange(e.target.value)}
              placeholder="0"
              style={{ padding: '8px 10px', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label htmlFor="mGenderSelect" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>GENDER</label>
            <select
              id="mGenderSelect"
              value={mGender}
              onChange={(e) => setMGender(e.target.value)}
              style={{ padding: '8px 10px', fontSize: '0.85rem' }}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Member Vulnerability checklist */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>SPECIAL ASSISTANCE NEEDS</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'mobility', label: 'Mobility Support' },
              { id: 'infant', label: 'Infant / Child care' },
              { id: 'medical', label: 'Chronic Medical Needs' }
            ].map(v => {
              const selected = mVuln.includes(v.id);
              return (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => toggleMemberVuln(v.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    border: selected ? '1px solid var(--error-color)' : '1px solid var(--border-color)',
                    background: selected ? 'rgba(244, 63, 94, 0.05)' : 'transparent',
                    color: selected ? 'var(--error-color)' : 'var(--text-secondary)'
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={addMember}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.8rem', alignSelf: 'flex-start' }}
        >
          + Add Member to Directory
        </button>
      </div>

      {/* Language Preference */}
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          PREFERRED ASSISTANT LANGUAGE
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {LANGUAGES.map(lang => (
            <button
              type="button"
              key={lang}
              onClick={() => setLanguage(lang)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: language === lang ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                background: language === lang ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: language === lang ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="gradient-btn"
        style={{ width: '100%', padding: '14px' }}
      >
        {loading ? 'Analyzing Hazards with GenAI...' : 'Generate Preparedness Plan'}
        {!loading && <ChevronRight size={18} />}
      </button>
    </form>
  );
};
