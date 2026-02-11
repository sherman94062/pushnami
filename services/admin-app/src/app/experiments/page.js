import Link from 'next/link';
import { apiFetch } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function ExperimentsPage() {
  let experiments = [];
  try {
    experiments = await apiFetch('/api/experiments');
  } catch (err) {
    console.error('Failed to fetch experiments:', err);
  }

  return (
    <>
      <h2>Experiments</h2>
      {experiments.length === 0 ? (
        <div className="card">
          <p>No experiments configured.</p>
        </div>
      ) : (
        experiments.map((exp) => (
          <Link
            key={exp.id}
            href={`/experiments/${exp.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card experiment-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ flex: 1 }}>{exp.name}</h3>
                <span
                  className={`badge ${exp.is_active ? 'badge--active' : 'badge--inactive'}`}
                >
                  {exp.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p>{exp.description}</p>
              <p style={{ fontSize: 13, color: '#64748b' }}>
                {exp.variants?.length || 0} variant(s)
              </p>
            </div>
          </Link>
        ))
      )}
    </>
  );
}
