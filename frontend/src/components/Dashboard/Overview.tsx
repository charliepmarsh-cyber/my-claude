import { DollarSign, ShoppingCart, Eye, TrendingUp, UserCheck, Percent } from 'lucide-react';
import KPICard from './KPICard';
import RevenueChart from './RevenueChart';
import { demoData } from '../../data/demo';

export default function Overview() {
  const d = demoData.dashboard;
  const s = demoData.sparklines;
  const maxVisits = Math.max(...d.topTrafficSources.map(t => t.visits));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Revenue"
          value={`£${d.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          color="from-emerald-50 to-emerald-100"
          trend={{ value: 14.2, direction: 'up' }}
          sparkline={s.revenue}
        />
        <KPICard
          title="Total Orders"
          value={d.totalOrders.toLocaleString()}
          icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
          color="from-blue-50 to-blue-100"
          trend={{ value: 8.7, direction: 'up' }}
          sparkline={s.orders}
        />
        <KPICard
          title="AOV"
          value={`£${d.aov.toFixed(2)}`}
          icon={<TrendingUp className="w-5 h-5 text-violet-600" />}
          color="from-violet-50 to-violet-100"
          trend={{ value: 3.1, direction: 'up' }}
          sparkline={s.aov}
        />
        <KPICard
          title="Page Views"
          value={d.pageViews.toLocaleString()}
          icon={<Eye className="w-5 h-5 text-orange-600" />}
          color="from-orange-50 to-orange-100"
          trend={{ value: 12.4, direction: 'up' }}
          sparkline={s.pageViews}
        />
        <KPICard
          title="Conversion Rate"
          value={`${(d.conversionRate * 100).toFixed(1)}%`}
          icon={<Percent className="w-5 h-5 text-teal-600" />}
          color="from-teal-50 to-teal-100"
          trend={{ value: 5.2, direction: 'up' }}
          sparkline={s.conversion}
        />
        <KPICard
          title="Returning"
          value={`${(d.returningCustomerRate * 100).toFixed(0)}%`}
          icon={<UserCheck className="w-5 h-5 text-indigo-600" />}
          color="from-indigo-50 to-indigo-100"
          trend={{ value: 2.8, direction: 'up' }}
          sparkline={s.returning}
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
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-500">{d.liveVisitors} live</span>
            </div>
          </div>
          <div className="space-y-3">
            {d.topTrafficSources.map((src, i) => {
              const colors = ['bg-blue-500', 'bg-gray-500', 'bg-violet-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-pink-500'];
              return (
                <div key={src.source}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                      <span className="text-gray-700">{src.source}</span>
                    </span>
                    <span className="text-gray-500 font-medium">{src.visits.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div
                      className={`h-1.5 rounded-full ${colors[i % colors.length]}`}
                      style={{ width: `${(src.visits / maxVisits) * 100}%` }}
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
