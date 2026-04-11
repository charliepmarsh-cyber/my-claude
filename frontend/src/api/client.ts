const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const tenantId = localStorage.getItem('tenant_id') || '1';
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE}${endpoint}${separator}tenant_id=${tenantId}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getDashboard: () => request<DashboardData>('/api/dashboard'),
  getChannels: () => request<ChannelData>('/api/channels'),
  getProducts: () => request<ProductData[]>('/api/products'),
  getAttribution: (visitorId: string) => request<AttributionData>(`/api/attribution/${visitorId}`),
  getAIReferrals: () => request<AIReferralData>('/api/ai-referrals'),
  askAI: (question: string) =>
    request<AIResponse>('/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: localStorage.getItem('tenant_id') || '1', question }),
    }),
};

export interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  aov: number;
  pageViews: number;
  conversionRate: number;
  returningCustomerRate: number;
  revenueTimeSeries: { date: string; revenue: number }[];
  topTrafficSources: { source: string; visits: number }[];
  liveVisitors: number;
}

export interface ChannelData {
  channels: { name: string; revenue: number; orders: number; share: number; status: string }[];
  googleAds: { clicks: number; impressions: number; spend: number; revenue: number; conversions: number; ctr: number; cpc: number; roas: number };
  email: { campaigns: number; subscribers: number; openRate: number; clickRate: number; revenue: number; newSubs: number };
  deviceSplit: { device: string; percentage: number }[];
}

export interface ProductData {
  sku: string;
  name: string;
  channel: string;
  views: number;
  addToCart: number;
  sales: number;
  revenue: number;
  convRate: number;
}

export interface AttributionData {
  journey: { event_type: string; page_title: string; source: string; medium: string; campaign: string; device: string; timestamp: string }[];
  first_touch: { source: string; medium: string };
  time_to_convert_minutes: number;
  total_touchpoints: number;
  channels_touched: string[];
  converted: boolean;
}

export interface AIReferralData {
  totalOrders: number;
  totalRevenue: number;
  uniqueVisitors: number;
  bySource: { source: string; orders: number; revenue: number; visitors: number }[];
  topProducts: { name: string; orders: number; revenue: number }[];
}

export interface AIResponse {
  answer: string;
  context_loaded: Record<string, boolean>;
}
