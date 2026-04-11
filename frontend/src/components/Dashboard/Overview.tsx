import { DollarSign, ShoppingCart, Eye, Users, TrendingUp, UserCheck } from 'lucide-react';
import KPICard from './KPICard';
import RevenueChart from './RevenueChart';
import { demoData } from '../../data/demo';

export default function Overview() {
  const d = demoData.dashboard;
  const maxVisits = Math.max(...d.topTrafficSources.map(s => s.visits));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Revenue"
          value={`£${d.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          color="bg-green-50"
        />
        <KPICard
          title="Total Orders"
          value={d.totalOrders.toLocaleString()}
          icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
          color="bg-blue-50"
        />
        <KPICard
          title="AOV"
          value={`£${d.aov.toFixed(2)}`}
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          color="bg-purple-50"
        />
        <KPICard
          title="Page Views"
          value={d.pageViews.toLocaleString()}
          icon={<Eye className="w-5 h-5 text-orange-600" />}
          color="bg-orange-50"
        />
        <KPICard
          title="Conversion Rate"
          value={`${(d.conversionRate * 100).toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
          color="bg-teal-50"
        />
        <KPICard
          title="Returning"
          value={`${(d.returningCustomerRate * 100).toFixed(0)}%`}
          icon={<UserCheck className="w-5 h-5 text-indigo-600" />}
          color="bg-indigo-50"
        />
      </div>

      {/* Revenue Chart + Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={d.revenueTimeSeries} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Traffic Sources</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-500">{d.liveVisitors} live</span>
            </div>
          </div>
          <div className="space-y-3">
            {d.topTrafficSources.map((s, i) => {
              const colors = ['bg-blue-500', 'bg-gray-500', 'bg-purple-500', 'bg-indigo-500', 'bg-green-500', 'bg-pink-500'];
              return (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{s.source}</span>
                    <span className="text-gray-500">{s.visits.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className={`h-2 rounded-full ${colors[i % colors.length]}`}
                      style={{ width: `${(s.visits / maxVisits) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
