import { useState, useEffect } from 'react';
import { ShoppingCart, Eye, Bot, MousePointerClick, CreditCard } from 'lucide-react';

interface Activity {
  id: number;
  type: 'order' | 'view' | 'ai_referral' | 'add_to_cart' | 'checkout';
  message: string;
  time: string;
  amount?: string;
}

const products = [
  'Premium Wireless Earbuds', 'LED Desk Lamp', 'Organic Cotton T-Shirt',
  'Water Bottle 1L', 'Bluetooth Speaker', 'Yoga Mat', 'Leather Wallet',
  'Bamboo Phone Stand', 'Resistance Bands', 'Soy Candle',
];

const cities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Edinburgh', 'Glasgow', 'Liverpool'];
const aiSources = ['ChatGPT', 'Perplexity', 'Claude', 'Gemini'];

function randomActivity(id: number): Activity {
  const types: Activity['type'][] = ['order', 'view', 'view', 'view', 'ai_referral', 'add_to_cart', 'checkout'];
  const type = types[Math.floor(Math.random() * types.length)];
  const product = products[Math.floor(Math.random() * products.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const ai = aiSources[Math.floor(Math.random() * aiSources.length)];

  const templates: Record<Activity['type'], () => { message: string; amount?: string }> = {
    order: () => ({ message: `New order from ${city}`, amount: `£${(30 + Math.random() * 70).toFixed(2)}` }),
    view: () => ({ message: `Someone viewed ${product}` }),
    ai_referral: () => ({ message: `Visitor from ${ai} landed on store` }),
    add_to_cart: () => ({ message: `${product} added to cart` }),
    checkout: () => ({ message: `Checkout started from ${city}` }),
  };

  const t = templates[type]();
  return { id, type, time: 'Just now', ...t };
}

const icons: Record<Activity['type'], typeof ShoppingCart> = {
  order: CreditCard,
  view: Eye,
  ai_referral: Bot,
  add_to_cart: ShoppingCart,
  checkout: MousePointerClick,
};

const iconColors: Record<Activity['type'], string> = {
  order: 'text-emerald-500 bg-emerald-50',
  view: 'text-blue-500 bg-blue-50',
  ai_referral: 'text-violet-500 bg-violet-50',
  add_to_cart: 'text-amber-500 bg-amber-50',
  checkout: 'text-indigo-500 bg-indigo-50',
};

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({ ...randomActivity(i), time: `${i + 1}m ago` }))
  );
  const [, setNextId] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setNextId(prev => {
        const id = prev + 1;
        setActivities(curr => [randomActivity(id), ...curr.slice(0, 6)]);
        return id;
      });
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, []);

  // Update times
  useEffect(() => {
    const timer = setInterval(() => {
      setActivities(curr => curr.map((a, i) => ({
        ...a,
        time: i === 0 ? 'Just now' : `${i * 2}m ago`,
      })));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Live Activity</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-emerald-600 font-medium">LIVE</span>
        </div>
      </div>
      <div className="space-y-2 overflow-hidden">
        {activities.map((a, i) => {
          const Icon = icons[a.type];
          const color = iconColors[a.type];
          return (
            <div
              key={a.id}
              className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/40 transition ${i === 0 ? 'animate-slide-in' : ''}`}
            >
              <div className={`p-1.5 rounded-lg ${color} shrink-0`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{a.message}</p>
                {a.amount && <p className="text-[10px] font-semibold text-emerald-600">{a.amount}</p>}
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">{a.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
