import { NavLink } from 'react-router-dom';
import {
  Activity, LayoutDashboard, BarChart3, Package, GitBranch, Bot,
  MessageSquare, LogOut, Filter, FlaskConical, Sparkles, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navSections = [
  {
    label: 'Analytics',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Overview' },
      { to: '/channels', icon: BarChart3, label: 'Channels' },
      { to: '/products', icon: Package, label: 'Products' },
      { to: '/profit', icon: TrendingUp, label: 'Profit' },
      { to: '/funnel', icon: Filter, label: 'Funnel' },
      { to: '/attribution', icon: GitBranch, label: 'Attribution' },
    ],
  },
  {
    label: 'AI Platform',
    badge: true,
    items: [
      { to: '/ai-referrals', icon: Bot, label: 'AI Referrals' },
      { to: '/ai-recommendations', icon: Sparkles, label: 'AI Recs' },
      { to: '/ai-assistant', icon: MessageSquare, label: 'AI Assistant' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { to: '/ab-testing', icon: FlaskConical, label: 'A/B Testing' },
    ],
  },
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
    <aside className="w-64 bg-gradient-to-b from-[#1a1f36] via-[#1e2545] to-[#141831] text-white flex flex-col min-h-screen fixed left-0 top-0 sidebar-scroll overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/30 blur-lg rounded-full" />
            <Activity className="w-7 h-7 text-blue-400 relative heartbeat-icon" />
          </div>
          <span className="text-xl font-bold pulse-gradient-text">PulseCommerce</span>
        </div>
        {user && (
          <div className="mt-3">
            <p className="text-sm text-gray-300">{user.name}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 pulse-gradient text-white rounded-full">
              {user.plan}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 mt-1">
        {navSections.map(section => (
          <div key={section.label}>
            <div className="flex items-center gap-2 px-3 mb-1.5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{section.label}</p>
              {section.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full pulse-gradient text-white font-bold badge-shimmer">
                  AI
                </span>
              )}
            </div>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500/20 to-transparent text-blue-300 border-l-2 border-blue-400'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                    }`
                  }
                >
                  <item.icon className="w-4.5 h-4.5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Channel Status */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Channels</p>
        <div className="space-y-1.5">
          {channelStatuses.map(ch => (
            <div key={ch.name} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{ch.name}</span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  ch.status === 'connected' ? 'bg-green-400 pulse-glow' :
                  ch.status === 'phase_2' ? 'bg-orange-400' : 'bg-gray-600'
                }`} />
                <span className={`text-[10px] ${
                  ch.status === 'connected' ? 'text-green-400' :
                  ch.status === 'phase_2' ? 'text-orange-400' : 'text-gray-600'
                }`}>
                  {ch.status === 'connected' ? 'Live' : ch.status === 'phase_2' ? 'Soon' : 'Off'}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-500 hover:text-white text-xs transition w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
