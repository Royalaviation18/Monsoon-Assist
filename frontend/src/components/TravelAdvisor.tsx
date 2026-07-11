import React, { useState } from 'react';
import { Compass, CheckCircle, Navigation } from 'lucide-react';

export const TravelAdvisor: React.FC = () => {
  const [origin, setOrigin] = useState('Mumbai');
  const [destination, setDestination] = useState('Pune');
  const [mode, setMode] = useState('driving');
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/monsoon/travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, mode })
      });
      if (res.ok) {
        const data = await res.json();
        setAssessment(data);
      }
    } catch (err) {
      console.error('Travel assessment query failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHazardColor = (rating: number) => {
    if (rating <= 3) return 'var(--success-color)';
    if (rating <= 7) return 'var(--warning-color)';
    return 'var(--error-color)';
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={20} style={{ color: 'var(--accent-color)' }} />
          Weather-Aware Travel Advisor
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Assess waterlogging, landslide blockages, and severe visibility conditions along your route before departure.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              ORIGIN CITY
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Mumbai"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              DESTINATION CITY
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Pune"
              required
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            MODE OF TRAVEL
          </label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="driving">Driving / Car</option>
            <option value="two_wheeler">Two-Wheeler (Motorcycle/Scooter)</option>
            <option value="train">Train</option>
            <option value="flight">Flight</option>
          </select>
        </div>

        <button type="submit" className="gradient-btn" disabled={loading}>
          {loading ? 'Evaluating hazards...' : 'Check Route Safety'}
          {!loading && <Navigation size={14} />}
        </button>
      </form>

      {assessment && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Risk Badge */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: `4px solid ${getHazardColor(assessment.hazardRating)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: getHazardColor(assessment.hazardRating) }}>
                {assessment.hazardRating}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>HAZARD INDEX (1-10)</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {assessment.hazardRating <= 3 ? 'Low Risk Route' : assessment.hazardRating <= 7 ? 'Caution Advised' : 'High Danger Level'}
              </div>
            </div>
          </div>

          {/* Advisory */}
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>ROUTE SAFETY ADVISORY</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: '8px', borderLeft: `3px solid ${getHazardColor(assessment.hazardRating)}` }}>
              {assessment.advisory}
            </p>
          </div>

          {/* Precautions */}
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>RECOMMENDED PRECAUTIONS</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {assessment.precautions.map((precaution: string, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'start', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={14} style={{ color: 'var(--success-color)', marginTop: '2px', flexShrink: 0 }} />
                  <span>{precaution}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
