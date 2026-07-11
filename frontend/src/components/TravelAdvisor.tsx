import React, { useState } from 'react';
import { Compass, CheckCircle, Navigation } from 'lucide-react';
import { apiFetch } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TravelAdvisorProps {
  /** Pre-fills the origin city from the active household's location. */
  defaultOrigin?: string;
}

interface TravelAssessment {
  hazardRating: number;
  advisory: string;
  precautions: string[];
}

// ─── Static styles (hoisted to avoid object recreation on every render) ───────

const CARD_STYLE: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '20px' };
const FORM_STYLE: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '14px' };
const GRID_2_STYLE: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };
const LABEL_STYLE: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' };
const RESULT_WRAP: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', animation: 'fadeIn 0.3s ease-out' };
const BADGE_WRAP: React.CSSProperties = { display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' };
const PRECAUTION_LIST: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const PRECAUTION_ROW: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'start', fontSize: '0.85rem', color: 'var(--text-secondary)' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps a hazard rating (1-10) to the corresponding CSS color variable. */
const getHazardColor = (rating: number): string => {
  if (rating <= 3) return 'var(--success-color)';
  if (rating <= 7) return 'var(--warning-color)';
  return 'var(--error-color)';
};

/** Maps a hazard rating to a human-readable risk label. */
const getHazardLabel = (rating: number): string => {
  if (rating <= 3) return 'Low Risk Route';
  if (rating <= 7) return 'Caution Advised';
  return 'High Danger Level';
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TravelAdvisor — AI-powered monsoon travel risk assessor.
 * Accepts origin/destination city names and travel mode, then calls
 * the Gemini-backed `/api/monsoon/travel` endpoint for a hazard rating,
 * advisory text, and precaution list.
 */
export const TravelAdvisor: React.FC<TravelAdvisorProps> = ({ defaultOrigin = 'Mumbai' }) => {
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState('Pune');
  const [mode, setMode] = useState('driving');
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<TravelAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAssessment(null);
    try {
      const res = await apiFetch('/api/monsoon/travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, mode }),
      });
      if (res.ok) {
        const data: TravelAssessment = await res.json();
        setAssessment(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Travel assessment failed. Please try again.');
      }
    } catch {
      setError('Network error. Could not reach the travel advisor. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={CARD_STYLE}>
      <div>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={20} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
          Weather-Aware Travel Advisor
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Assess waterlogging, landslide blockages, and visibility conditions along your monsoon route before departure.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={FORM_STYLE}>
        <div style={GRID_2_STYLE}>
          <div>
            <label htmlFor="originCityInput" style={LABEL_STYLE}>ORIGIN CITY</label>
            <input
              id="originCityInput"
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Mumbai"
              required
            />
          </div>
          <div>
            <label htmlFor="destinationCityInput" style={LABEL_STYLE}>DESTINATION CITY</label>
            <input
              id="destinationCityInput"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Pune"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="travelModeSelect" style={LABEL_STYLE}>MODE OF TRAVEL</label>
          <select id="travelModeSelect" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="driving">Driving / Car</option>
            <option value="two_wheeler">Two-Wheeler (Motorcycle/Scooter)</option>
            <option value="train">Train</option>
            <option value="flight">Flight</option>
          </select>
        </div>

        <button type="submit" className="gradient-btn" disabled={loading} aria-busy={loading}>
          {loading ? 'Evaluating hazards...' : 'Check Route Safety'}
          {!loading && <Navigation size={14} aria-hidden="true" />}
        </button>
      </form>

      {error && (
        <div role="alert" style={{ background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--error-color)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.84rem' }}>
          ⚠ {error}
        </div>
      )}

      {assessment && (
        <div style={RESULT_WRAP} aria-live="polite">
          {/* Hazard Badge */}
          <div style={BADGE_WRAP}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              border: `4px solid ${getHazardColor(assessment.hazardRating)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: getHazardColor(assessment.hazardRating) }}>
                {assessment.hazardRating}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>HAZARD INDEX (1-10)</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {getHazardLabel(assessment.hazardRating)}
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
            <ul style={PRECAUTION_LIST} aria-label="Recommended precautions">
              {assessment.precautions.map((precaution, idx) => (
                <li key={idx} style={PRECAUTION_ROW}>
                  <CheckCircle size={14} style={{ color: 'var(--success-color)', marginTop: '2px', flexShrink: 0 }} aria-hidden="true" />
                  <span>{precaution}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
