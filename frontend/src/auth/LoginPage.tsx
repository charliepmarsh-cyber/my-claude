import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Activity } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@pulsecommerce.io');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(email, password);
    if (ok) navigate('/');
    else setError('Invalid credentials');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f36] via-[#1e2545] to-[#141831] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/40 blur-xl rounded-full" />
            <Activity className="w-9 h-9 text-blue-400 relative" />
          </div>
          <span className="text-2xl font-bold pulse-gradient-text">PulseCommerce</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-semibold text-gray-900 text-center">Welcome back</h2>
          <p className="text-sm text-gray-400 text-center mt-1 mb-6">Sign in to your analytics dashboard</p>

          {error && <div className="bg-red-50 text-red-600 p-2.5 rounded-lg mb-4 text-xs">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg font-medium text-sm text-white pulse-gradient hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
            >
              Sign In
            </button>
          </form>

          <p className="text-[10px] text-gray-400 text-center mt-5">
            Demo: demo@pulsecommerce.io / demo123
          </p>
        </div>

        <p className="text-[10px] text-gray-500 text-center mt-6">
          Powered by PulseCommerce &middot; AI-Driven Analytics
        </p>
      </div>
    </div>
  );
}
