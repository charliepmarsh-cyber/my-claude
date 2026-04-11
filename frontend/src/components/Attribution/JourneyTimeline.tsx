import { Eye, ShoppingCart, CreditCard, MousePointerClick } from 'lucide-react';
import { demoData } from '../../data/demo';

const eventIcons: Record<string, typeof Eye> = {
  page_view: Eye,
  add_to_cart: ShoppingCart,
  purchase: CreditCard,
};

const eventColors: Record<string, string> = {
  page_view: 'bg-blue-100 text-blue-600',
  add_to_cart: 'bg-orange-100 text-orange-600',
  purchase: 'bg-green-100 text-green-600',
};

export default function JourneyTimeline() {
  const a = demoData.attribution;
  const days = Math.floor(a.time_to_convert_minutes / 1440);
  const hrs = Math.floor((a.time_to_convert_minutes % 1440) / 60);
  const mins = a.time_to_convert_minutes % 60;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Touchpoints</p>
          <p className="text-2xl font-bold text-gray-900">{a.total_touchpoints}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Time to Convert</p>
          <p className="text-2xl font-bold text-gray-900">{days}d {hrs}h {mins}m</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">First Touch</p>
          <p className="text-lg font-bold text-gray-900">{a.first_touch.source} ({a.first_touch.medium})</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Conversion Value</p>
          <p className="text-2xl font-bold text-green-600">£{a.conversion_value}</p>
        </div>
      </div>

      {/* Channels Touched */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Channels Touched</h3>
        <div className="flex gap-2 flex-wrap">
          {a.channels_touched.map(ch => (
            <span key={ch} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              {ch}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visitor Journey: {a.visitorId}</h3>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-6">
            {a.journey.map((tp, i) => {
              const Icon = eventIcons[tp.event_type] || MousePointerClick;
              const color = eventColors[tp.event_type] || 'bg-gray-100 text-gray-600';
              const dt = new Date(tp.timestamp);
              return (
                <div key={i} className="relative pl-12">
                  <div className={`absolute left-2.5 w-5 h-5 rounded-full flex items-center justify-center ${color}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {tp.event_type.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">{tp.device}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{tp.page_title}</p>
                    {tp.source && (
                      <p className="text-xs text-gray-500 mt-1">
                        Source: {tp.source} / {tp.medium}
                        {tp.campaign && ` / ${tp.campaign}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
