import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './auth/LoginPage';
import Sidebar from './components/Layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ChannelsPage from './pages/ChannelsPage';
import ProductsPage from './pages/ProductsPage';
import AttributionPage from './pages/AttributionPage';
import AIReferralsPage from './pages/AIReferralsPage';
import AIAssistantPage from './pages/AIAssistantPage';

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/channels" element={<ChannelsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/attribution" element={<AttributionPage />} />
          <Route path="/ai-referrals" element={<AIReferralsPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
