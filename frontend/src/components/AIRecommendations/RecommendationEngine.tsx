import { ArrowRight } from 'lucide-react';
import { demoData } from '../../data/demo';

const typeBadge: Record<string, { label: string; color: string }> = {
  cross_sell: { label: 'Cross-sell', color: 'bg-blue-50 text-blue-600' },
  upsell: { label: 'Upsell', color: 'bg-violet-50 text-violet-600' },
  bundle: { label: 'Bundle', color: 'bg-amber-50 text-amber-700' },
  frequently_bought: { label: 'Freq. Bought', color: 'bg-emerald-50 text-emerald-600' },
};

export default function RecommendationEngine() {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendation Pairs</h3>
      <div className="space-y-3">
        {demoData.aiRecommendations.recommendations.map((r, i) => {
          const badge = typeBadge[r.type] || typeBadge.cross_sell;
          return (
            <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
              {/* Trigger Product */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">When viewing</p>
                <p className="text-sm font-medium text-gray-900 truncate">{r.trigger}</p>
              </div>

              {/* Arrow + Type Badge */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                  {badge.label}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>

              {/* Suggested Product */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Recommend</p>
                <p className="text-sm font-medium text-gray-900 truncate">{r.suggested}</p>
              </div>

              {/* Confidence */}
              <div className="shrink-0 w-16">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Conf.</p>
                  <p className="text-sm font-bold text-gray-900">{(r.confidence * 100).toFixed(0)}%</p>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full mt-1">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: `${r.confidence * 100}%` }} />
                </div>
              </div>

              {/* Metrics */}
              <div className="shrink-0 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-400">Shown</p>
                  <p className="text-xs font-semibold">{r.shown.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Clicked</p>
                  <p className="text-xs font-semibold">{r.clicked}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Revenue</p>
                  <p className="text-xs font-bold text-emerald-600">£{r.revenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
