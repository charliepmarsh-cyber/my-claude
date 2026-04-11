import { demoData } from '../../data/demo';

export default function ProfitOverview() {
  const p = demoData.profit;

  return (
    <div className="space-y-6">
      {/* Product Profit Table */}
      <div className="glass rounded-2xl p-5 overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Profitability</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium text-right">Revenue</th>
              <th className="pb-3 font-medium text-right">Cost</th>
              <th className="pb-3 font-medium text-right">Profit</th>
              <th className="pb-3 font-medium text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {p.byProduct.map(prod => (
              <tr key={prod.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="py-3 font-medium text-gray-900">{prod.name}</td>
                <td className="py-3 text-right text-gray-700">£{prod.revenue.toLocaleString()}</td>
                <td className="py-3 text-right text-gray-500">£{prod.cost.toLocaleString()}</td>
                <td className="py-3 text-right font-medium text-emerald-600">£{prod.profit.toLocaleString()}</td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-gray-100 rounded-full">
                      <div
                        className={`h-2 rounded-full ${
                          prod.margin >= 0.65 ? 'bg-emerald-500' :
                          prod.margin >= 0.45 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${prod.margin * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-10 text-right">
                      {(prod.margin * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Channel Profitability */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Profitability</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {p.byChannel.map(ch => (
            <div key={ch.channel} className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">{ch.channel}</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">£{ch.profit.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">{(ch.margin * 100).toFixed(0)}% margin</p>
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full">
                <div
                  className={`h-full rounded-full ${
                    ch.margin >= 0.65 ? 'bg-emerald-500' :
                    ch.margin >= 0.4 ? 'bg-amber-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${ch.margin * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
