const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';

export async function getAssignment(visitorId, experimentName) {
  const res = await fetch(
    `${API_BASE}/api/experiments/assign?visitor_id=${encodeURIComponent(visitorId)}&experiment_name=${encodeURIComponent(experimentName)}`,
    { cache: 'no-store' }
  );
  if (!res.ok) {
    console.error('Assignment API error:', res.status, await res.text());
    return null;
  }
  return res.json();
}

export async function getToggles() {
  const res = await fetch(`${API_BASE}/api/toggles`, { cache: 'no-store' });
  if (!res.ok) {
    console.error('Toggles API error:', res.status, await res.text());
    return [];
  }
  return res.json();
}
