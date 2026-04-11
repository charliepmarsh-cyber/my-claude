import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  color: string;
  trend?: { value: number; direction: 'up' | 'down' };
  sparkline?: number[];
}

function Sparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  const h = 24;
  const w = 64;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(' ');

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function KPICard({ title, value, subtitle, icon, color, trend, sparkline }: KPICardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${
                trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trend.direction === 'up' ? '+' : ''}{trend.value}%
              </span>
            )}
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${color}`}>{icon}</div>
          {sparkline && <Sparkline data={sparkline} />}
        </div>
      </div>
    </div>
  );
}
