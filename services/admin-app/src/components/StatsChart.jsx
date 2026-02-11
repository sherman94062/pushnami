'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function StatsChart({ breakdown }) {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="chart-container">
        <h3>Events by Variant</h3>
        <p style={{ color: '#64748b' }}>No event data yet.</p>
      </div>
    );
  }

  // Pivot: group by event_type, with variant counts as columns
  const eventTypes = [...new Set(breakdown.map((r) => r.event_type))];
  const variantNames = [...new Set(breakdown.map((r) => r.variant_name))];

  const chartData = eventTypes.map((eventType) => {
    const row = { event_type: eventType };
    for (const vName of variantNames) {
      const match = breakdown.find(
        (r) => r.event_type === eventType && r.variant_name === vName
      );
      row[vName] = match ? match.event_count : 0;
    }
    return row;
  });

  return (
    <div className="chart-container">
      <h3>Events by Variant</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="event_type" />
          <YAxis />
          <Tooltip />
          <Legend />
          {variantNames.map((name, i) => (
            <Bar
              key={name}
              dataKey={name}
              fill={COLORS[i % COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
