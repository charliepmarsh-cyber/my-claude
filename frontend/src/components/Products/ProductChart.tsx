import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { demoData } from '../../data/demo';

export default function ProductChart() {
  const top7 = demoData.products.slice(0, 7).map(p => ({
    name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
    revenue: p.revenue,
  }));

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top7} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Tooltip formatter={(v: number) => `£${v.toLocaleString()}`} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
