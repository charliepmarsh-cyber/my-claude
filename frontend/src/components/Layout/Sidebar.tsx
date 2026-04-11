import { NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, BarChart3, Package, GitBranch, Bot, MessageSquare, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/channels', icon: BarChart3, label: 'Channels' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/attribution', icon: GitBranch, label: 'Attribution' },
  { to: '/ai-referrals', icon: Bot, label: 'AI Referrals' },
  { to: '/ai-assistant', icon: MessageSquare, label: 'AI Assistant' },
];

const channelStatuses = [
  { name: 'Shopify', status: 'connected' },
  { name: 'Amazon', status: 'phase_2' },
  { name: 'Google Ads', status: 'connected' },
  { name: 'Mailchimp', status: 'connected' },
  { name: 'Social', status: 'connected' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-[#1a1f36] text-white flex flex-col min-h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Activity className="w-7 h-7 text-blue-400" />
          <span className="text-xl font-bold">PulseCommerce</span>
        </div>
        {user && (
          <div className="mt-3">
            <p className="text-sm text-gray-300">{user.name}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
              {user.plan}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Channel Status */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Channels</p>
        <div className="space-y-2">
          {channelStatuses.map(ch => (
            <div key={ch.name} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{ch.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  ch.status === 'connected'
                    ? 'bg-green-500/20 text-green-400'
                    : ch.status === 'phase_2'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-gray-500/20 text-gray-500'
                }`}
              >
                {ch.status === 'connected' ? 'Connected' : ch.status === 'phase_2' ? 'Phase 2' : 'Off'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
