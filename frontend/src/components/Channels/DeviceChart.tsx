import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { demoData } from '../../data/demo';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b'];

export default function DeviceChart() {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Split</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={demoData.deviceSplit}
              dataKey="percentage"
              nameKey="device"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              label={({ device, percentage }) => `${device} ${percentage}%`}
            >
              {demoData.deviceSplit.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
