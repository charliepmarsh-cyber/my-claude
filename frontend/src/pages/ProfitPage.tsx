import Header from '../components/Layout/Header';
import KPICard from '../components/Dashboard/KPICard';
import MarginChart from '../components/Profit/MarginChart';
import ProfitOverview from '../components/Profit/ProfitOverview';
import { DollarSign, TrendingUp, Receipt, Percent } from 'lucide-react';
import { demoData } from '../data/demo';

export default function ProfitPage() {
  const p = demoData.profit;

  return (
    <>
      <Header title="Profit" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Revenue"
            value={`£${p.totalRevenue.toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5 text-blue-600" />}
            color="from-blue-50 to-blue-100"
            sparkline={demoData.sparklines.revenue}
            trend={{ value: 14.2, direction: 'up' }}
          />
          <KPICard
            title="Gross Profit"
            value={`£${p.grossProfit.toLocaleString()}`}
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            color="from-emerald-50 to-emerald-100"
            trend={{ value: 11.8, direction: 'up' }}
          />
          <KPICard
            title="Ad Spend"
            value={`£${p.adSpend.toLocaleString()}`}
            icon={<Receipt className="w-5 h-5 text-red-500" />}
            color="from-red-50 to-red-100"
            trend={{ value: 2.1, direction: 'down' }}
          />
          <KPICard
            title="Net Margin"
            value={`${(p.netMargin * 100).toFixed(1)}%`}
            subtitle={`£${p.netProfit.toLocaleString()} net`}
            icon={<Percent className="w-5 h-5 text-violet-600" />}
            color="from-violet-50 to-violet-100"
            trend={{ value: 3.2, direction: 'up' }}
          />
        </div>

        <MarginChart />
        <ProfitOverview />
      </div>
    </>
  );
}
