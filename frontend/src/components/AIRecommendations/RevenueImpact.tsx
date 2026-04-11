import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { demoData } from '../../data/demo';

export default function RevenueImpact() {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Revenue Impact</h3>
      <p className="text-sm text-gray-500 mb-4">Organic revenue vs. with AI recommendations enabled</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={demoData.aiRecommendations.revenueImpact}>
            <defs>
              <linearGradient id="gradOrganic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRecs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip formatter={(v: number) => `£${v.toLocaleString()}`} />
            <Legend />
            <Area type="monotone" dataKey="organic" stroke="#94a3b8" fill="url(#gradOrganic)" strokeWidth={2} name="Without Recs" />
            <Area type="monotone" dataKey="withRecs" stroke="#8b5cf6" fill="url(#gradRecs)" strokeWidth={2} name="With AI Recs" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
