import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ShoppingCart, DollarSign, Users } from 'lucide-react';
import KPICard from '../Dashboard/KPICard';
import { demoData } from '../../data/demo';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

export default function AIOverview() {
  const ai = demoData.aiReferrals;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="AI-Referred Orders"
          value={ai.totalOrders.toString()}
          icon={<ShoppingCart className="w-5 h-5 text-purple-600" />}
          color="bg-purple-50"
        />
        <KPICard
          title="AI-Referred Revenue"
          value={`£${ai.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          color="bg-green-50"
        />
        <KPICard
          title="Unique AI Visitors"
          value={ai.uniqueVisitors.toString()}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          color="bg-blue-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart by Source */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by AI Source</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ai.bySource}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="source" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart Distribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ai.bySource}
                  dataKey="revenue"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}
                >
                  {ai.bySource.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `£${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products from AI */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products from AI Traffic</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium text-right">Orders</th>
              <th className="pb-3 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {ai.topProducts.map(p => (
              <tr key={p.name} className="border-b border-gray-50 last:border-0">
                <td className="py-3 font-medium text-gray-900">{p.name}</td>
                <td className="py-3 text-right text-gray-700">{p.orders}</td>
                <td className="py-3 text-right font-medium text-gray-900">£{p.revenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
