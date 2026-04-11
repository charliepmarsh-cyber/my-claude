import { useState } from 'react';
import { demoData } from '../../data/demo';

type SortKey = 'revenue' | 'sales' | 'views' | 'convRate';

export default function ProductTable() {
  const [sortBy, setSortBy] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...demoData.products].sort((a, b) =>
    sortDir === 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]
  );

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-xs">{sortBy === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}</span>
  );

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">SKU Performance</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="pb-3 font-medium">SKU</th>
            <th className="pb-3 font-medium">Product</th>
            <th className="pb-3 font-medium">Channel</th>
            <th className="pb-3 font-medium text-right cursor-pointer" onClick={() => toggleSort('views')}>
              Views<SortIcon k="views" />
            </th>
            <th className="pb-3 font-medium text-right">ATC</th>
            <th className="pb-3 font-medium text-right cursor-pointer" onClick={() => toggleSort('sales')}>
              Sales<SortIcon k="sales" />
            </th>
            <th className="pb-3 font-medium text-right cursor-pointer" onClick={() => toggleSort('revenue')}>
              Revenue<SortIcon k="revenue" />
            </th>
            <th className="pb-3 font-medium text-right cursor-pointer" onClick={() => toggleSort('convRate')}>
              Conv %<SortIcon k="convRate" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.sku} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <td className="py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
              <td className="py-3 text-gray-900 font-medium">{p.name}</td>
              <td className="py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.channel === 'Shopify' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                }`}>{p.channel}</span>
              </td>
              <td className="py-3 text-right text-gray-700">{p.views.toLocaleString()}</td>
              <td className="py-3 text-right text-gray-700">{p.addToCart.toLocaleString()}</td>
              <td className="py-3 text-right text-gray-700">{p.sales.toLocaleString()}</td>
              <td className="py-3 text-right font-medium text-gray-900">£{p.revenue.toLocaleString()}</td>
              <td className="py-3 text-right">
                <span className={`font-medium ${p.convRate >= 5 ? 'text-green-600' : 'text-gray-700'}`}>
                  {p.convRate.toFixed(2)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
