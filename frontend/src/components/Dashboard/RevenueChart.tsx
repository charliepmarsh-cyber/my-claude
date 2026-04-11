import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { date: string; revenue: number }[];
}

export default function RevenueChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue (30 Days)</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={v => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={v => `£${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip
              formatter={(v: number) => [`£${v.toLocaleString()}`, 'Revenue']}
              labelFormatter={v => new Date(v).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
