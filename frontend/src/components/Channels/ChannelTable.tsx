import { demoData } from '../../data/demo';

export default function ChannelTable() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Revenue Breakdown</h3>
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
            <th className="pb-3 font-medium">Channel</th>
            <th className="pb-3 font-medium text-right">Revenue</th>
            <th className="pb-3 font-medium text-right">Orders</th>
            <th className="pb-3 font-medium text-right">Share</th>
            <th className="pb-3 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {demoData.channels.map(ch => (
            <tr key={ch.name} className="border-b border-gray-50 last:border-0">
              <td className="py-3 font-medium text-gray-900">{ch.name}</td>
              <td className="py-3 text-right text-gray-700">£{ch.revenue.toLocaleString()}</td>
              <td className="py-3 text-right text-gray-700">{ch.orders.toLocaleString()}</td>
              <td className="py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${ch.share * 100}%` }} />
                  </div>
                  <span className="text-sm text-gray-500">{(ch.share * 100).toFixed(1)}%</span>
                </div>
              </td>
              <td className="py-3 text-right">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  ch.status === 'connected' ? 'bg-green-50 text-green-600' :
                  ch.status === 'phase_2' ? 'bg-orange-50 text-orange-600' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {ch.status === 'connected' ? 'Connected' : ch.status === 'phase_2' ? 'Phase 2' : 'Off'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
