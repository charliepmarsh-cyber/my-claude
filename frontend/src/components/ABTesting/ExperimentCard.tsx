import { useState } from 'react';
import { ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SignificanceMeter from './SignificanceMeter';

interface Variant {
  name: string;
  visitors: number;
  conversions: number;
  revenue: number;
  convRate: number;
}

interface Experiment {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'paused';
  startDate: string;
  traffic: number;
  variants: Variant[];
  significance: number;
  metric: string;
  uplift: number;
}

export default function ExperimentCard({ exp }: { exp: Experiment }) {
  const [expanded, setExpanded] = useState(false);
  const winner = exp.variants.reduce((a, b) => a.convRate > b.convRate ? a : b);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${
            exp.status === 'running' ? 'bg-blue-500 animate-pulse' :
            exp.status === 'completed' ? 'bg-emerald-500' : 'bg-gray-400'
          }`} />
          <div className="text-left">
            <p className="font-semibold text-gray-900">{exp.name}</p>
            <p className="text-xs text-gray-500">Started {exp.startDate} &middot; {exp.traffic.toLocaleString()} visitors</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`text-lg font-bold ${exp.uplift > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              +{exp.uplift}%
            </p>
            <p className="text-xs text-gray-400">uplift</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            exp.status === 'running' ? 'bg-blue-50 text-blue-600' :
            exp.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
            'bg-gray-100 text-gray-500'
          }`}>
            {exp.status}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Significance Meter */}
      <div className="px-5 pb-4">
        <SignificanceMeter value={exp.significance} />
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Variant Comparison */}
            <div className="space-y-3">
              {exp.variants.map(v => {
                const isWinner = v === winner;
                return (
                  <div key={v.name} className={`p-4 rounded-lg border ${isWinner ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {isWinner && <Crown className="w-4 h-4 text-amber-500" />}
                      <p className={`text-sm font-medium ${isWinner ? 'text-emerald-700' : 'text-gray-700'}`}>{v.name}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Visitors</p>
                        <p className="text-sm font-semibold">{v.visitors.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Converts</p>
                        <p className="text-sm font-semibold">{v.conversions}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Revenue</p>
                        <p className="text-sm font-semibold">£{v.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Conv %</p>
                        <p className={`text-sm font-bold ${isWinner ? 'text-emerald-600' : 'text-gray-700'}`}>{v.convRate}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bar Chart */}
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exp.variants}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="convRate" radius={[4, 4, 0, 0]}>
                    {exp.variants.map((v, i) => (
                      <rect key={i} fill={v === winner ? '#10b981' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
