import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
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
import FunnelPage from './pages/FunnelPage';
import ABTestingPage from './pages/ABTestingPage';
import AIRecommendationsPage from './pages/AIRecommendationsPage';
import ProfitPage from './pages/ProfitPage';

function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Outlet />
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
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/channels" element={<ChannelsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/profit" element={<ProfitPage />} />
            <Route path="/funnel" element={<FunnelPage />} />
            <Route path="/attribution" element={<AttributionPage />} />
            <Route path="/ai-referrals" element={<AIReferralsPage />} />
            <Route path="/ai-recommendations" element={<AIRecommendationsPage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/ab-testing" element={<ABTestingPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
