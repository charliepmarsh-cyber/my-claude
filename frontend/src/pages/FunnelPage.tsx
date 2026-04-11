import Header from '../components/Layout/Header';
import FunnelChart from '../components/Funnel/FunnelChart';
import FunnelStageCard from '../components/Funnel/FunnelStageCard';
import KPICard from '../components/Dashboard/KPICard';
import { Target, ShoppingCart, TrendingDown, Percent } from 'lucide-react';
import { demoData } from '../data/demo';

export default function FunnelPage() {
  const f = demoData.funnel;
  const cartAbandonment = ((1 - f.stages[4].count / f.stages[2].count) * 100).toFixed(1);

  return (
    <>
      <Header title="Funnel" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Overall Conversion"
            value={`${(f.overall * 100).toFixed(2)}%`}
            icon={<Target className="w-5 h-5 text-blue-600" />}
            color="from-blue-50 to-blue-100"
            trend={{ value: 8.2, direction: 'up' }}
          />
          <KPICard
            title="Total Purchases"
            value={f.stages[4].count.toLocaleString()}
            icon={<ShoppingCart className="w-5 h-5 text-emerald-600" />}
            color="from-emerald-50 to-emerald-100"
            trend={{ value: 12.1, direction: 'up' }}
          />
          <KPICard
            title="Cart Abandonment"
            value={`${cartAbandonment}%`}
            icon={<TrendingDown className="w-5 h-5 text-red-500" />}
            color="from-red-50 to-red-100"
            trend={{ value: 3.4, direction: 'down' }}
          />
          <KPICard
            title="Checkout Rate"
            value={`${((f.stages[3].count / f.stages[2].count) * 100).toFixed(1)}%`}
            icon={<Percent className="w-5 h-5 text-violet-600" />}
            color="from-violet-50 to-violet-100"
            trend={{ value: 5.8, direction: 'up' }}
          />
        </div>
        <FunnelChart />
        <FunnelStageCard />
      </div>
    </>
  );
}
