import { useAuth } from '../../hooks/useAuth';
import { Bell, ChevronDown, Users } from 'lucide-react';
import { demoData } from '../../data/demo';

export default function Header({ title }: { title: string }) {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-6 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <span className="text-xs text-gray-400 hidden sm:inline">{today}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <button className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500 hover:bg-gray-100 transition">
          Last 30 Days
          <ChevronDown className="w-3 h-3" />
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-md">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <Users className="w-3 h-3 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">{demoData.dashboard.liveVisitors}</span>
        </div>

        <button className="relative p-1.5 text-gray-400 hover:text-gray-600 transition rounded-md hover:bg-gray-50">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-0.5" />

        <div className="flex items-center gap-2">
          <div className="text-right hidden md:block">
            <p className="text-xs font-medium text-gray-700 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-gray-400 leading-tight">Winston Demo</p>
          </div>
          <div className="p-[1.5px] rounded-full bg-gradient-to-br from-blue-500 to-violet-500">
            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-xs font-bold pulse-gradient-text">
              {user?.name?.charAt(0) || 'D'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
