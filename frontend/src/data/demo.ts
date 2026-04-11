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
    weeklyTrend: [18, 22, 26, 32],
  },

  funnel: {
    stages: [
      { name: 'Site Visits', count: 94210, color: '#3b82f6' },
      { name: 'Product Views', count: 28940, color: '#6366f1' },
      { name: 'Add to Cart', count: 4000, color: '#8b5cf6' },
      { name: 'Checkout Started', count: 2680, color: '#a855f7' },
      { name: 'Purchase', count: 1842, color: '#10b981' },
    ],
    conversionRates: [
      { from: 'Visits', to: 'Views', rate: 0.307 },
      { from: 'Views', to: 'Cart', rate: 0.138 },
      { from: 'Cart', to: 'Checkout', rate: 0.670 },
      { from: 'Checkout', to: 'Purchase', rate: 0.687 },
    ],
    overall: 0.0195,
    dropoffs: [
      { from: 'Product View', to: 'Add to Cart', dropRate: 0.862, suggestion: 'Add urgency elements and social proof below product images' },
      { from: 'Add to Cart', to: 'Checkout', dropRate: 0.330, suggestion: 'Simplify checkout — enable guest checkout and reduce form fields' },
      { from: 'Checkout', to: 'Purchase', dropRate: 0.313, suggestion: 'Add more payment options (Apple Pay, Klarna) and trust badges' },
    ],
    byDevice: [
      { device: 'Desktop', visits: 58410, purchases: 1210, rate: 0.0207 },
      { device: 'Mobile', visits: 29205, purchases: 540, rate: 0.0185 },
      { device: 'Tablet', visits: 6595, purchases: 92, rate: 0.0139 },
    ],
  },

  abTesting: {
    experiments: [
      {
        id: 'exp_001', name: 'Product Page CTA Color', status: 'running' as const,
        startDate: '2026-03-28', traffic: 4820,
        variants: [
          { name: 'Control (Blue)', visitors: 2410, conversions: 142, revenue: 7100, convRate: 5.89 },
          { name: 'Variant A (Green)', visitors: 2410, conversions: 168, revenue: 8400, convRate: 6.97 },
        ],
        significance: 0.92, metric: 'Conversion Rate', uplift: 18.3,
      },
      {
        id: 'exp_002', name: 'Checkout Flow: 1-Step vs 2-Step', status: 'completed' as const,
        startDate: '2026-03-15', traffic: 5340,
        variants: [
          { name: 'Control (2-Step)', visitors: 2670, conversions: 178, revenue: 8900, convRate: 6.67 },
          { name: 'Variant A (1-Step)', visitors: 2670, conversions: 214, revenue: 10700, convRate: 8.01 },
        ],
        significance: 0.97, metric: 'Conversion Rate', uplift: 20.1,
      },
      {
        id: 'exp_003', name: 'Homepage Hero Banner', status: 'running' as const,
        startDate: '2026-04-05', traffic: 2100,
        variants: [
          { name: 'Control (Static)', visitors: 1050, conversions: 31, revenue: 1550, convRate: 2.95 },
          { name: 'Variant A (Animated)', visitors: 1050, conversions: 38, revenue: 1900, convRate: 3.62 },
        ],
        significance: 0.68, metric: 'Conversion Rate', uplift: 22.7,
      },
    ],
  },

  aiRecommendations: {
    totalRevenueFromRecs: 18420,
    clickThroughRate: 0.124,
    conversionLift: 0.23,
    avgOrderValueLift: 12.40,
    recommendations: [
      { type: 'cross_sell', trigger: 'Premium Wireless Earbuds', suggested: 'Portable Bluetooth Speaker', confidence: 0.94, shown: 1240, clicked: 186, conversions: 48, revenue: 2400 },
      { type: 'upsell', trigger: 'Organic Cotton T-Shirt', suggested: 'Premium Wireless Earbuds', confidence: 0.87, shown: 980, clicked: 127, conversions: 34, revenue: 1700 },
      { type: 'cross_sell', trigger: 'Yoga Mat (Non-Slip)', suggested: 'Resistance Bands Set', confidence: 0.91, shown: 860, clicked: 112, conversions: 29, revenue: 870 },
      { type: 'bundle', trigger: 'LED Desk Lamp', suggested: 'Bamboo Phone Stand', confidence: 0.82, shown: 720, clicked: 94, conversions: 22, revenue: 550 },
      { type: 'frequently_bought', trigger: 'Water Bottle 1L', suggested: 'Yoga Mat (Non-Slip)', confidence: 0.78, shown: 640, clicked: 77, conversions: 18, revenue: 720 },
    ],
    revenueImpact: [
      { week: 'W1', organic: 22400, withRecs: 26200 },
      { week: 'W2', organic: 23100, withRecs: 27800 },
      { week: 'W3', organic: 21800, withRecs: 26900 },
      { week: 'W4', organic: 24200, withRecs: 29400 },
    ],
  },

  profit: {
    totalRevenue: 148320.50,
    totalCost: 82450.20,
    grossProfit: 65870.30,
    profitMargin: 0.444,
    adSpend: 4280.50,
    netProfit: 61589.80,
    netMargin: 0.415,
    byProduct: [
      { name: 'Premium Wireless Earbuds', revenue: 14196, cost: 5680, profit: 8516, margin: 0.60 },
      { name: 'LED Desk Lamp', revenue: 8040, cost: 3620, profit: 4420, margin: 0.55 },
      { name: 'Organic Cotton T-Shirt', revenue: 6930, cost: 2080, profit: 4850, margin: 0.70 },
      { name: 'Water Bottle 1L', revenue: 5940, cost: 2380, profit: 3560, margin: 0.60 },
      { name: 'Bluetooth Speaker', revenue: 5400, cost: 2700, profit: 2700, margin: 0.50 },
      { name: 'Yoga Mat', revenue: 4840, cost: 1940, profit: 2900, margin: 0.60 },
      { name: 'Leather Wallet', revenue: 4800, cost: 1440, profit: 3360, margin: 0.70 },
      { name: 'Bamboo Phone Stand', revenue: 3900, cost: 1560, profit: 2340, margin: 0.60 },
      { name: 'Resistance Bands', revenue: 2460, cost: 740, profit: 1720, margin: 0.70 },
      { name: 'Soy Candle', revenue: 1850, cost: 560, profit: 1290, margin: 0.70 },
    ],
    byChannel: [
      { channel: 'Shopify', revenue: 98450, cost: 54150, profit: 44300, margin: 0.45 },
      { channel: 'Amazon', revenue: 28900, cost: 17340, profit: 11560, margin: 0.40 },
      { channel: 'Google Ads', revenue: 12470, cost: 8560, profit: 3910, margin: 0.31 },
      { channel: 'Email', revenue: 5200, cost: 1560, profit: 3640, margin: 0.70 },
      { channel: 'AI Referrals', revenue: 3300, cost: 840, profit: 2460, margin: 0.75 },
    ],
    timeSeries: generateTimeSeries().map(d => ({
      date: d.date,
      revenue: d.revenue,
      cost: Math.round(d.revenue * 0.556),
      profit: Math.round(d.revenue * 0.444),
    })),
  },

  // Sparkline data for KPI trends
  sparklines: {
    revenue: [4100, 4500, 4300, 4800, 5000, 4700, 4900, 5100, 4600, 4800, 5200, 4940],
    orders: [52, 58, 55, 62, 65, 60, 63, 66, 59, 62, 67, 64],
    aov: [78, 79, 80, 79, 81, 80, 82, 81, 80, 81, 80, 81],
    pageViews: [2800, 3100, 2900, 3300, 3500, 3200, 3400, 3600, 3100, 3300, 3500, 3400],
    conversion: [3.2, 3.5, 3.4, 3.7, 3.8, 3.6, 3.7, 3.9, 3.5, 3.7, 3.8, 3.8],
    returning: [38, 39, 40, 39, 41, 40, 42, 41, 41, 42, 42, 42],
  },
};
