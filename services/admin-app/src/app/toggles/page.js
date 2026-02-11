'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

export default function TogglesPage() {
  const [toggles, setToggles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadToggles();
  }, []);

  async function loadToggles() {
    try {
      setLoading(true);
      const data = await apiFetch('/api/toggles');
      setToggles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(toggle) {
    try {
      const updated = await apiFetch(`/api/toggles/${toggle.id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !toggle.enabled }),
      });
      setToggles((prev) => prev.map((t) => (t.id === toggle.id ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConfigUpdate(toggle, configKey, value) {
    try {
      const newConfig = { ...toggle.config, [configKey]: value };
      const updated = await apiFetch(`/api/toggles/${toggle.id}`, {
        method: 'PUT',
        body: JSON.stringify({ config: newConfig }),
      });
      setToggles((prev) => prev.map((t) => (t.id === toggle.id ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <>
      <h2>Feature Toggles</h2>
      {toggles.map((toggle) => (
        <div key={toggle.id} className="card">
          <div className="toggle-row">
            <div className="toggle-info">
              <h3>{toggle.label}</h3>
              <p>{toggle.description}</p>
              <span className="toggle-key">{toggle.key}</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={toggle.enabled}
                onChange={() => handleToggle(toggle)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {toggle.key === 'cta_text_override' && toggle.enabled && (
            <div className="config-editor">
              <label>Override Text</label>
              <input
                type="text"
                value={toggle.config?.text || ''}
                onChange={(e) =>
                  handleConfigUpdate(toggle, 'text', e.target.value)
                }
                placeholder="Enter CTA text override"
              />
            </div>
          )}

          {toggle.key === 'show_banner' && toggle.enabled && (
            <div className="config-editor">
              <label>Banner Text</label>
              <input
                type="text"
                value={toggle.config?.banner_text || ''}
                onChange={(e) =>
                  handleConfigUpdate(toggle, 'banner_text', e.target.value)
                }
                placeholder="Enter banner text"
              />
              <label style={{ marginTop: 8 }}>Banner Color</label>
              <input
                type="color"
                value={toggle.config?.banner_color || '#FF6B35'}
                onChange={(e) =>
                  handleConfigUpdate(toggle, 'banner_color', e.target.value)
                }
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
}
