'use client';

export default function ConversionTable({ breakdown, totals }) {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="card">
        <h3>Conversion Rates</h3>
        <p style={{ color: '#64748b' }}>No data yet. Visit the landing page to generate events.</p>
      </div>
    );
  }

  const variantNames = [...new Set(breakdown.map((r) => r.variant_name))];
  const eventTypes = [...new Set(breakdown.map((r) => r.event_type))];

  // Build lookup: { variant_name: { event_type: { event_count, unique_visitors } } }
  const lookup = {};
  for (const row of breakdown) {
    if (!lookup[row.variant_name]) lookup[row.variant_name] = {};
    lookup[row.variant_name][row.event_type] = {
      event_count: row.event_count,
      unique_visitors: row.unique_visitors,
    };
  }

  // Compute conversion rate: cta_click unique visitors / page_view unique visitors
  function getConversionRate(variantName) {
    const pageViews = lookup[variantName]?.page_view?.unique_visitors || 0;
    const ctaClicks = lookup[variantName]?.cta_click?.unique_visitors || 0;
    if (pageViews === 0) return '—';
    return ((ctaClicks / pageViews) * 100).toFixed(1) + '%';
  }

  return (
    <div className="card">
      <h3>Performance by Variant</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Variant</th>
            {eventTypes.map((et) => (
              <th key={et}>{et}</th>
            ))}
            <th>Conversion Rate</th>
          </tr>
        </thead>
        <tbody>
          {variantNames.map((vName) => (
            <tr key={vName}>
              <td style={{ fontWeight: 600 }}>{vName}</td>
              {eventTypes.map((et) => (
                <td key={et}>
                  {lookup[vName]?.[et]?.event_count || 0}
                  <span
                    style={{
                      color: '#64748b',
                      fontSize: 12,
                      marginLeft: 4,
                    }}
                  >
                    ({lookup[vName]?.[et]?.unique_visitors || 0} unique)
                  </span>
                </td>
              ))}
              <td style={{ fontWeight: 700, color: '#2563eb' }}>
                {getConversionRate(vName)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
