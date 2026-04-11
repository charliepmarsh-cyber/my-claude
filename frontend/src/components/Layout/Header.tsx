import { useAuth } from '../../hooks/useAuth';

export default function Header({ title }: { title: string }) {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="flex items-center justify-between py-4 px-6 bg-white border-b border-gray-200">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{today}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">{user?.email}</p>
          <p className="text-xs text-gray-400">Winston Demo</p>
        </div>
        <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user?.name?.charAt(0) || 'D'}
        </div>
      </div>
    </header>
  );
}
