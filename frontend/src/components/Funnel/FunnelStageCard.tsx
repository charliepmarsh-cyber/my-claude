import { Lightbulb } from 'lucide-react';
import { demoData } from '../../data/demo';

export default function FunnelStageCard() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Drop-off Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {demoData.funnel.dropoffs.map(d => (
          <div key={d.from} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-orange-400" />
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500">{d.from} &rarr; {d.to}</p>
                <p className="text-2xl font-bold text-red-500">{(d.dropRate * 100).toFixed(0)}%</p>
                <p className="text-xs text-gray-400">drop off</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{d.suggestion}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Device Breakdown */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Conversion by Device</h4>
        <div className="grid grid-cols-3 gap-4">
          {demoData.funnel.byDevice.map(d => (
            <div key={d.device} className="text-center">
              <p className="text-xs text-gray-500">{d.device}</p>
              <p className="text-lg font-bold text-gray-900">{(d.rate * 100).toFixed(2)}%</p>
              <p className="text-xs text-gray-400">{d.purchases.toLocaleString()} / {d.visits.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
