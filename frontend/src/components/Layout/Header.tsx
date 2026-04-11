import { useAuth } from '../../hooks/useAuth';
import { Bell, ChevronDown, Users } from 'lucide-react';
import { demoData } from '../../data/demo';

export default function Header({ title }: { title: string }) {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <header className="flex items-center justify-between py-3 px-6 bg-white border-b border-gray-200">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{today}</p>
      </div>
      <div className="flex items-center gap-4">
        {/* Date Range Pill */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">
          Last 30 Days
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Live Visitors */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">{demoData.dashboard.liveVisitors}</span>
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-[11px] text-gray-400">Winston Demo</p>
          </div>
          <div className="p-0.5 rounded-full bg-gradient-to-br from-blue-500 to-violet-500">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-bold pulse-gradient-text">
              {user?.name?.charAt(0) || 'D'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
