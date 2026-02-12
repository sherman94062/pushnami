import { apiFetch } from '../lib/api';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let toggles = [];
  let experiments = [];
  let recentEvents = [];

  try {
    const [togglesData, experimentsData, eventsData] = await Promise.all([
      apiFetch('/api/toggles'),
      apiFetch('/api/experiments'),
      apiFetch('/api/events?limit=5'),
    ]);
    
    toggles = togglesData;
    experiments = experimentsData;
    // Handle new paginated response format
    recentEvents = eventsData.events || eventsData;
  } catch (err) {
    console.error('Dashboard fetch error:', err);
  }

  const activeExperiments = experiments.filter((e) => e.is_active).length;
  const enabledToggles = toggles.filter((t) => t.enabled).length;

  return (
    <>
      <h2>Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{experiments.length}</div>
          <div className="stat-label">Total Experiments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeExperiments}</div>
          <div className="stat-label">Active Experiments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {enabledToggles}/{toggles.length}
          </div>
          <div className="stat-label">Toggles Enabled</div>
        </div>
      </div>

      <div className="card">
        <h3>Recent Events</h3>
        {recentEvents.length === 0 ? (
          <p>No events yet. Visit the landing page to generate events.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Visitor</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id}>
                  <td>{event.event_type}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {event.visitor_id.substring(0, 8)}...
                  </td>
                  <td>{new Date(event.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
