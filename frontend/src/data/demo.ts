// Demo data matching the seed-demo.sql exactly
// This allows the frontend to work standalone without the n8n API

function generateTimeSeries() {
  const data = [];
  const base = new Date('2026-03-13');
  const revenues = [
    4500, 4830, 5150, 4110, 3920, 5000, 4630, 5160, 4440, 4910,
    4220, 4730, 5290, 4380, 4590, 5070, 3980, 4890, 5200, 4510,
    4770, 5030, 4300, 4830, 4100, 4660, 5140, 4480, 4730, 4940
  ];
  for (let i = 0; i < 30; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    data.push({ date: d.toISOString().split('T')[0], revenue: revenues[i] });
  }
  return data;
}

export const demoData = {
  dashboard: {
    totalRevenue: 148320.5,
    totalOrders: 1842,
    aov: 80.52,
    pageViews: 94210,
    conversionRate: 0.038,
    returningCustomerRate: 0.42,
    revenueTimeSeries: generateTimeSeries(),
    topTrafficSources: [
      { source: 'Google (Organic)', visits: 32400 },
      { source: 'Direct', visits: 21800 },
      { source: 'ChatGPT / AI', visits: 12600 },
      { source: 'Facebook', visits: 9800 },
      { source: 'Mailchimp Email', visits: 7200 },
      { source: 'Instagram', visits: 5400 },
    ],
    liveVisitors: 37,
  },

  channels: [
    { name: 'Shopify', revenue: 98450, orders: 1210, share: 0.663, status: 'connected' },
    { name: 'Amazon', revenue: 28900, orders: 380, share: 0.195, status: 'phase_2' },
    { name: 'Google Ads', revenue: 12470.5, orders: 152, share: 0.084, status: 'connected' },
    { name: 'Email', revenue: 5200, orders: 68, share: 0.035, status: 'connected' },
    { name: 'AI Referrals', revenue: 3300, orders: 32, share: 0.023, status: 'connected' },
  ],

  googleAds: {
    clicks: 8420,
    impressions: 142300,
    spend: 4280.5,
    revenue: 12470.5,
    conversions: 152,
    ctr: 0.0592,
    cpc: 0.51,
    roas: 2.91,
  },

  email: {
    campaigns: 12,
    subscribers: 8420,
    openRate: 0.284,
    clickRate: 0.042,
    revenue: 5200,
    newSubs: 340,
  },

  deviceSplit: [
    { device: 'Desktop', percentage: 62 },
    { device: 'Mobile', percentage: 31 },
    { device: 'Tablet', percentage: 7 },
  ],

  products: [
    { sku: 'SKU-1001', name: 'Premium Wireless Earbuds', channel: 'Shopify', views: 4820, addToCart: 612, sales: 284, revenue: 14196, convRate: 5.89 },
    { sku: 'SKU-1005', name: 'LED Desk Lamp (Adjustable)', channel: 'Shopify', views: 2750, addToCart: 290, sales: 134, revenue: 8040, convRate: 4.87 },
    { sku: 'SKU-1002', name: 'Organic Cotton T-Shirt (Black)', channel: 'Shopify', views: 3910, addToCart: 498, sales: 231, revenue: 6930, convRate: 5.91 },
    { sku: 'SKU-1003', name: 'Stainless Steel Water Bottle 1L', channel: 'Shopify', views: 3640, addToCart: 410, sales: 198, revenue: 5940, convRate: 5.44 },
    { sku: 'SKU-1007', name: 'Portable Bluetooth Speaker', channel: 'Shopify', views: 2180, addToCart: 240, sales: 108, revenue: 5400, convRate: 4.95 },
    { sku: 'SKU-1006', name: 'Yoga Mat (Non-Slip)', channel: 'Amazon', views: 2410, addToCart: 265, sales: 121, revenue: 4840, convRate: 5.02 },
    { sku: 'SKU-1008', name: 'Minimalist Leather Wallet', channel: 'Shopify', views: 1950, addToCart: 210, sales: 96, revenue: 4800, convRate: 4.92 },
    { sku: 'SKU-1004', name: 'Bamboo Phone Stand', channel: 'Amazon', views: 2980, addToCart: 320, sales: 156, revenue: 3900, convRate: 5.23 },
    { sku: 'SKU-1009', name: 'Resistance Bands Set (5-Pack)', channel: 'Amazon', views: 1720, addToCart: 185, sales: 82, revenue: 2460, convRate: 4.77 },
    { sku: 'SKU-1010', name: 'Scented Soy Candle (Lavender)', channel: 'Shopify', views: 1580, addToCart: 170, sales: 74, revenue: 1850, convRate: 4.68 },
  ],

  attribution: {
    visitorId: 'vis_demo_8f3a2c',
    journey: [
      { event_type: 'page_view', page_title: 'Homepage', source: 'google', medium: 'organic', campaign: '', referrer: 'google.com/search', device: 'desktop', timestamp: '2026-04-07T10:12:00' },
      { event_type: 'page_view', page_title: 'Premium Wireless Earbuds', source: '', medium: '', campaign: '', referrer: '', device: 'desktop', timestamp: '2026-04-07T10:14:00' },
      { event_type: 'add_to_cart', page_title: 'Premium Wireless Earbuds', source: '', medium: '', campaign: '', referrer: '', device: 'desktop', timestamp: '2026-04-07T10:16:00' },
      { event_type: 'page_view', page_title: 'Homepage', source: 'chatgpt.com', medium: 'ai_referral', campaign: '', referrer: 'chatgpt.com/', device: 'mobile', timestamp: '2026-04-08T15:30:00' },
      { event_type: 'page_view', page_title: 'Premium Wireless Earbuds', source: '', medium: '', campaign: '', referrer: '', device: 'mobile', timestamp: '2026-04-08T15:32:00' },
      { event_type: 'page_view', page_title: 'Homepage', source: 'mailchimp', medium: 'email', campaign: 'spring_sale_2026', referrer: 'mail.google.com/', device: 'desktop', timestamp: '2026-04-10T17:34:00' },
      { event_type: 'page_view', page_title: 'Premium Wireless Earbuds', source: '', medium: '', campaign: '', referrer: '', device: 'desktop', timestamp: '2026-04-10T17:35:00' },
      { event_type: 'purchase', page_title: 'Order Confirmed', source: '', medium: '', campaign: '', referrer: '', device: 'desktop', timestamp: '2026-04-10T17:38:00' },
    ],
    first_touch: { source: 'google', medium: 'organic' },
    time_to_convert_minutes: 4642,
    total_touchpoints: 8,
    channels_touched: ['Google Organic', 'ChatGPT (AI)', 'Mailchimp Email'],
    converted: true,
    conversion_value: 49.99,
  },

  aiReferrals: {
    totalOrders: 32,
    totalRevenue: 3300,
    uniqueVisitors: 128,
    bySource: [
      { source: 'ChatGPT', orders: 14, revenue: 1430, visitors: 56 },
      { source: 'Perplexity', orders: 8, revenue: 845, visitors: 34 },
      { source: 'Claude', orders: 5, revenue: 520, visitors: 20 },
      { source: 'Gemini', orders: 3, revenue: 350, visitors: 12 },
      { source: 'Copilot', orders: 2, revenue: 155, visitors: 6 },
    ],
    topProducts: [
      { name: 'Premium Wireless Earbuds', orders: 8, revenue: 400 },
      { name: 'LED Desk Lamp (Adjustable)', orders: 5, revenue: 300 },
      { name: 'Organic Cotton T-Shirt (Black)', orders: 4, revenue: 120 },
      { name: 'Portable Bluetooth Speaker', orders: 3, revenue: 150 },
      { name: 'Leather Wallet', orders: 3, revenue: 150 },
    ],
  },
};
