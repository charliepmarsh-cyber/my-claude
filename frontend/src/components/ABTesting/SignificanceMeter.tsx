export default function SignificanceMeter({ value }: { value: number }) {
  const pct = value * 100;
  const color = pct >= 95 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-500' : 'bg-gray-400';
  const label = pct >= 95 ? 'Significant' : pct >= 80 ? 'Approaching' : 'Collecting data';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">Statistical Significance</span>
        <span className={`font-medium ${pct >= 95 ? 'text-emerald-600' : pct >= 80 ? 'text-amber-600' : 'text-gray-500'}`}>
          {pct.toFixed(0)}% — {label}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
        {/* Zone markers */}
        <div className="absolute inset-0 flex">
          <div className="w-[80%] border-r border-gray-300/50" />
          <div className="w-[15%] border-r border-gray-300/50" />
        </div>
        {/* Progress */}
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
        <span>0%</span>
        <span>80%</span>
        <span>95%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
