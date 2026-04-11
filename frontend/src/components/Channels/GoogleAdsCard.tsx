import { demoData } from '../../data/demo';

export default function GoogleAdsCard() {
  const g = demoData.googleAds;
  const metrics = [
    { label: 'Clicks', value: g.clicks.toLocaleString() },
    { label: 'Impressions', value: g.impressions.toLocaleString() },
    { label: 'Spend', value: `£${g.spend.toLocaleString()}` },
    { label: 'Revenue', value: `£${g.revenue.toLocaleString()}` },
    { label: 'ROAS', value: `${g.roas}x` },
    { label: 'CTR', value: `${(g.ctr * 100).toFixed(2)}%` },
    { label: 'CPC', value: `£${g.cpc.toFixed(2)}` },
    { label: 'Conversions', value: g.conversions.toString() },
  ];

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Ads Performance</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label}>
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className="text-lg font-semibold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
