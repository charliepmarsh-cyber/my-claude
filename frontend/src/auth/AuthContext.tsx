import { createContext, useState, type ReactNode } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string; name: string; tenantId: string; plan: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState['user']>(() => {
    const stored = localStorage.getItem('pulse_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Demo login - in production this would hit the auth API
    if (email === 'demo@pulsecommerce.io') {
      const u = { email, name: 'Demo User', tenantId: '1', plan: 'enterprise' };
      setUser(u);
      localStorage.setItem('pulse_user', JSON.stringify(u));
      localStorage.setItem('tenant_id', '1');
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pulse_user');
    localStorage.removeItem('tenant_id');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
