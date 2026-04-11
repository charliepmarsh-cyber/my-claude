import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { demoData } from '../../data/demo';

export default function MarginChart() {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Revenue vs Cost (30 Days)</h3>
      <p className="text-sm text-gray-500 mb-4">The gap between revenue and cost is your gross profit</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={demoData.profit.timeSeries}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={v => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            />
            <YAxis tickFormatter={v => `£${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip formatter={(v: number) => `£${v.toLocaleString()}`} />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#gradRevenue)" strokeWidth={2} name="Revenue" />
            <Area type="monotone" dataKey="cost" stroke="#ef4444" fill="url(#gradCost)" strokeWidth={2} name="Cost" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
