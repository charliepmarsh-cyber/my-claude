import { demoData } from '../../data/demo';

export default function EmailCard() {
  const e = demoData.email;
  const metrics = [
    { label: 'Campaigns', value: e.campaigns.toString() },
    { label: 'Subscribers', value: e.subscribers.toLocaleString() },
    { label: 'Open Rate', value: `${(e.openRate * 100).toFixed(1)}%` },
    { label: 'Click Rate', value: `${(e.clickRate * 100).toFixed(1)}%` },
    { label: 'Revenue', value: `£${e.revenue.toLocaleString()}` },
    { label: 'New Subs', value: `+${e.newSubs}` },
  ];

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Email (Mailchimp)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
