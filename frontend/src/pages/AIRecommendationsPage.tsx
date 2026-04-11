import Header from '../components/Layout/Header';
import KPICard from '../components/Dashboard/KPICard';
import RecommendationEngine from '../components/AIRecommendations/RecommendationEngine';
import RevenueImpact from '../components/AIRecommendations/RevenueImpact';
import { Sparkles, MousePointerClick, TrendingUp, DollarSign } from 'lucide-react';
import { demoData } from '../data/demo';

export default function AIRecommendationsPage() {
  const r = demoData.aiRecommendations;

  return (
    <>
      <Header title="AI Recommendations" />
      <div className="p-6 space-y-6">
        {/* AI Badge Header */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-purple-500/10 border border-violet-200/50">
          <div className="p-2 rounded-lg pulse-gradient">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Recommendation Engine</h2>
            <p className="text-sm text-gray-500">Powered by purchase pattern analysis across {demoData.products.length} products</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Revenue from Recs"
            value={`£${r.totalRevenueFromRecs.toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            color="from-emerald-50 to-emerald-100"
            trend={{ value: 18.4, direction: 'up' }}
          />
          <KPICard
            title="Click-Through Rate"
            value={`${(r.clickThroughRate * 100).toFixed(1)}%`}
            icon={<MousePointerClick className="w-5 h-5 text-blue-600" />}
            color="from-blue-50 to-blue-100"
            trend={{ value: 3.2, direction: 'up' }}
          />
          <KPICard
            title="Conversion Lift"
            value={`+${(r.conversionLift * 100).toFixed(0)}%`}
            icon={<TrendingUp className="w-5 h-5 text-violet-600" />}
            color="from-violet-50 to-violet-100"
            trend={{ value: 5.1, direction: 'up' }}
          />
          <KPICard
            title="AOV Lift"
            value={`+£${r.avgOrderValueLift.toFixed(2)}`}
            icon={<Sparkles className="w-5 h-5 text-amber-600" />}
            color="from-amber-50 to-amber-100"
            trend={{ value: 8.7, direction: 'up' }}
          />
        </div>

        <RevenueImpact />
        <RecommendationEngine />
      </div>
    </>
  );
}
