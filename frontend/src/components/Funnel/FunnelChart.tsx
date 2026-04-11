import { demoData } from '../../data/demo';

export default function FunnelChart() {
  const { stages } = demoData.funnel;
  const maxCount = stages[0].count;

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const widthPct = (stage.count / maxCount) * 100;
          const nextStage = stages[i + 1];
          const convRate = nextStage ? ((nextStage.count / stage.count) * 100).toFixed(1) : null;

          return (
            <div key={stage.name}>
              {/* Stage bar */}
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600 font-medium text-right shrink-0">
                  {stage.name}
                </div>
                <div className="flex-1 relative">
                  <div className="h-12 bg-gray-50 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center justify-end pr-4 funnel-bar"
                      style={{
                        width: `${widthPct}%`,
                        background: `linear-gradient(90deg, ${stage.color}dd, ${stage.color})`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    >
                      <span className="text-white font-bold text-sm drop-shadow">
                        {stage.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-16 text-right text-sm text-gray-500">
                  {((stage.count / maxCount) * 100).toFixed(1)}%
                </div>
              </div>

              {/* Conversion arrow between stages */}
              {convRate && (
                <div className="flex items-center gap-4 my-1">
                  <div className="w-32" />
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-xs">
                      <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                      </svg>
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-medium">
                        {convRate}% convert
                      </span>
                      <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="w-16" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
