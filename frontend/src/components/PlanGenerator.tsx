import React, { useState } from 'react';
import { ShieldAlert, Users, Home, ChevronRight, Check } from 'lucide-react';

interface PlanGeneratorProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

export const PlanGenerator: React.FC<PlanGeneratorProps> = ({ onSubmit, loading }) => {
  const [location, setLocation] = useState('Mumbai');
  const [householdSize, setHouseholdSize] = useState(3);
  const [buildingType, setBuildingType] = useState<'ground_floor' | 'high_rise' | 'independent'>('ground_floor');
  const [vulnerabilities, setVulnerabilities] = useState<string[]>([]);
  const [language, setLanguage] = useState('English');

  const COMMON_VULNERABILITIES = [
    { id: 'elderly', label: 'Elderly Relatives (65+)' },
    { id: 'infants', label: 'Infants or Young Kids' },
    { id: 'pets', label: 'Household Pets' },
    { id: 'medical_needs', label: 'Special Medical Needs' }
  ];

  const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'];

  const toggleVulnerability = (id: string) => {
    setVulnerabilities(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      location,
      householdSize,
      buildingType,
      vulnerabilities,
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Location */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            YOUR REGION / CITY
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Mumbai, Kerala, Assam"
            required
          />
        </div>

        {/* Household Size */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              HOUSEHOLD MEMBERS
            </label>
            <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{householdSize} People</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={18} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="range"
              min={1}
              max={15}
              value={householdSize}
              onChange={(e) => setHouseholdSize(Number(e.target.value))}
              style={{ padding: 0 }}
            />
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

      {/* Vulnerabilities Grid */}
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          HOUSEHOLD VULNERABILITIES
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {COMMON_VULNERABILITIES.map((vuln) => {
            const selected = vulnerabilities.includes(vuln.id);
            return (
              <button
                type="button"
                key={vuln.id}
                onClick={() => toggleVulnerability(vuln.id)}
                style={{
                  background: selected ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                  border: selected ? '1px solid var(--text-secondary)' : '1px solid var(--border-color)',
                  color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                {vuln.label}
                {selected && <Check size={14} style={{ color: 'var(--accent-color)' }} />}
              </button>
            );
          })}
        </div>
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
