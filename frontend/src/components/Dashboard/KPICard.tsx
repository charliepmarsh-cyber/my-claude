import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

interface KPICardProps {
  title: string;
  value: string;
  rawValue?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  subtitle?: string;
  icon: ReactNode;
  color: string;
  trend?: { value: number; direction: 'up' | 'down' };
  sparkline?: number[];
  breathing?: boolean;
}

function Sparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  const h = 20;
  const w = 56;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(' ');

  return (
    <svg width={w} height={h} className="opacity-50">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function KPICard({ title, value, rawValue, prefix, suffix, decimals, subtitle, icon, color, trend, sparkline, breathing }: KPICardProps) {
  return (
    <div className={`glass rounded-2xl p-4 hover:bg-white/75 transition-all duration-300 group hover:scale-[1.02] ${breathing ? 'glass-breathe' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <div className={`p-1.5 rounded-xl bg-gradient-to-br ${color} opacity-80 group-hover:opacity-100 transition-opacity`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">
        {rawValue !== undefined ? (
          <AnimatedCounter value={rawValue} prefix={prefix} suffix={suffix} decimals={decimals} />
        ) : (
          value
        )}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          {trend && (
            <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${
              trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.direction === 'up' ? '+' : ''}{trend.value}%
            </span>
          )}
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
        {sparkline && <Sparkline data={sparkline} />}
      </div>
    </div>
  );
}
