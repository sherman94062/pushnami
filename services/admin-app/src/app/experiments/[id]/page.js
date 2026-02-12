'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';
import StatsChart from '../../../components/StatsChart';
import ConversionTable from '../../../components/ConversionTable';

export default function ExperimentDetailPage({ params }) {
  const [id, setId] = useState(null);

  useEffect(() => {
    // Handle params as a promise (Next.js 15+) or plain object
    if (params && typeof params.then === 'function') {
      params.then((p) => setId(p.id));
    } else {
      setId(params.id);
    }
  }, [params]);
  const [experiment, setExperiment] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [exp, statsData] = await Promise.all([
          apiFetch(`/api/experiments/${id}`),
          apiFetch(`/api/events/stats?experiment_id=${id}`),
        ]);
        setExperiment(exp);
        setStats(statsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleToggleActive() {
    try {
      const updated = await apiFetch(`/api/experiments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !experiment.is_active }),
      });
      setExperiment((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!experiment) return <p>Experiment not found.</p>;

  return (
    <>
      <Link href="/experiments" className="back-link">
        &larr; Back to Experiments
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>{experiment.name}</h2>
        <span
          className={`badge ${experiment.is_active ? 'badge--active' : 'badge--inactive'}`}
        >
          {experiment.is_active ? 'Active' : 'Inactive'}
        </span>
        <button
          onClick={handleToggleActive}
          style={{
            padding: '6px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            background: '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {experiment.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>

      <p style={{ color: '#64748b', marginBottom: 24 }}>
        {experiment.description}
      </p>

      {/* Variants */}
      <div className="card">
        <h3>Variants</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Weight</th>
              <th>Config</th>
            </tr>
          </thead>
          <tbody>
            {experiment.variants?.map((v) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>{(parseFloat(v.weight) * 100).toFixed(0)}%</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {JSON.stringify(v.config)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      {stats && (
        <>
          <ConversionTable breakdown={stats.breakdown} totals={stats.totals} />
          <StatsChart breakdown={stats.breakdown} />
        </>
      )}
    </>
  );
}
