-- PulseCommerce Demo Data Seeder
-- Tenant: "Winston Demo" with realistic e-commerce data

-- Demo Tenant
INSERT INTO tenants (id, name, slug, plan, deployment_type, config, api_keys) VALUES (
  1, 'Winston Demo', 'winston-demo', 'enterprise', 'saas',
  '{"currency": "GBP", "timezone": "Europe/London"}',
  '{"shopify": {"store_url": "winston-demo.myshopify.com", "access_token": "shpat_demo_xxxxx"}}'
);

-- Demo User (password: demo123 - bcrypt hash)
INSERT INTO users (id, tenant_id, email, password_hash, name, role) VALUES (
  1, 1, 'demo@pulsecommerce.io', '$2b$10$rQZ8kHqLhbEiGKLqR3Q5/.placeholder_hash_demo123', 'Demo User', 'admin'
);

-- Channels
INSERT INTO channels (id, tenant_id, name, status, config) VALUES
  (1, 1, 'shopify', 'connected', '{}'),
  (2, 1, 'amazon', 'phase_2', '{}'),
  (3, 1, 'google_ads', 'connected', '{}'),
  (4, 1, 'mailchimp', 'connected', '{}'),
  (5, 1, 'social', 'connected', '{}');

-- Products (10 SKUs)
INSERT INTO products (id, tenant_id, sku, name, channel, price) VALUES
  (1, 1, 'SKU-1001', 'Premium Wireless Earbuds', 'shopify', 49.99),
  (2, 1, 'SKU-1002', 'Organic Cotton T-Shirt (Black)', 'shopify', 30.00),
  (3, 1, 'SKU-1003', 'Stainless Steel Water Bottle 1L', 'shopify', 30.00),
  (4, 1, 'SKU-1004', 'Bamboo Phone Stand', 'amazon', 25.00),
  (5, 1, 'SKU-1005', 'LED Desk Lamp (Adjustable)', 'shopify', 60.00),
  (6, 1, 'SKU-1006', 'Yoga Mat (Non-Slip)', 'amazon', 40.00),
  (7, 1, 'SKU-1007', 'Portable Bluetooth Speaker', 'shopify', 50.00),
  (8, 1, 'SKU-1008', 'Minimalist Leather Wallet', 'shopify', 50.00),
  (9, 1, 'SKU-1009', 'Resistance Bands Set (5-Pack)', 'amazon', 30.00),
  (10, 1, 'SKU-1010', 'Scented Soy Candle (Lavender)', 'shopify', 25.00);

-- Product Metrics (aggregated over 30 days)
INSERT INTO product_metrics (tenant_id, product_id, date, views, add_to_cart, sales, revenue, channel) VALUES
  (1, 1, '2026-04-11', 4820, 612, 284, 14196.00, 'shopify'),
  (1, 5, '2026-04-11', 2750, 290, 134, 8040.00, 'shopify'),
  (1, 2, '2026-04-11', 3910, 498, 231, 6930.00, 'shopify'),
  (1, 3, '2026-04-11', 3640, 410, 198, 5940.00, 'shopify'),
  (1, 7, '2026-04-11', 2180, 240, 108, 5400.00, 'shopify'),
  (1, 6, '2026-04-11', 2410, 265, 121, 4840.00, 'amazon'),
  (1, 8, '2026-04-11', 1950, 210, 96, 4800.00, 'shopify'),
  (1, 4, '2026-04-11', 2980, 320, 156, 3900.00, 'amazon'),
  (1, 9, '2026-04-11', 1720, 185, 82, 2460.00, 'amazon'),
  (1, 10, '2026-04-11', 1580, 170, 74, 1850.00, 'shopify');

-- Traffic Sources (30-day totals)
INSERT INTO traffic_sources (tenant_id, date, source, visits) VALUES
  (1, '2026-04-11', 'Google (Organic)', 32400),
  (1, '2026-04-11', 'Direct', 21800),
  (1, '2026-04-11', 'ChatGPT / AI', 12600),
  (1, '2026-04-11', 'Facebook', 9800),
  (1, '2026-04-11', 'Mailchimp Email', 7200),
  (1, '2026-04-11', 'Instagram', 5400);

-- Google Ads Metrics (30-day aggregate)
INSERT INTO google_ads_metrics (tenant_id, date, clicks, impressions, spend, revenue, conversions) VALUES
  (1, '2026-04-11', 8420, 142300, 4280.50, 12470.50, 152);

-- Email Metrics (12 campaigns)
INSERT INTO email_metrics (tenant_id, date, campaign_name, campaign_id, subscribers, open_rate, click_rate, revenue, new_subs) VALUES
  (1, '2026-03-15', 'Spring Collection Launch', 'camp_001', 8080, 0.3120, 0.0480, 620.00, 45),
  (1, '2026-03-18', 'Flash Sale - 24hrs Only', 'camp_002', 8100, 0.3450, 0.0560, 890.00, 28),
  (1, '2026-03-21', 'New Arrivals Alert', 'camp_003', 8120, 0.2680, 0.0380, 420.00, 32),
  (1, '2026-03-24', 'Customer Appreciation Week', 'camp_004', 8150, 0.2940, 0.0420, 510.00, 25),
  (1, '2026-03-27', 'Weekend Deals Roundup', 'camp_005', 8180, 0.2560, 0.0350, 380.00, 22),
  (1, '2026-03-30', 'Easter Early Access', 'camp_006', 8200, 0.3280, 0.0520, 720.00, 38),
  (1, '2026-04-02', 'Top Sellers This Month', 'camp_007', 8240, 0.2740, 0.0390, 440.00, 30),
  (1, '2026-04-04', 'Spring Sale - Extra 20% Off', 'camp_008', 8280, 0.3060, 0.0460, 580.00, 35),
  (1, '2026-04-05', 'Product Spotlight: Earbuds', 'camp_009', 8310, 0.2580, 0.0340, 310.00, 20),
  (1, '2026-04-07', 'Midweek Motivation Deals', 'camp_010', 8350, 0.2720, 0.0400, 120.00, 18),
  (1, '2026-04-09', 'Spring Sale 2026', 'camp_011', 8390, 0.2900, 0.0440, 150.00, 25),
  (1, '2026-04-11', 'Weekend Preview', 'camp_012', 8420, 0.2760, 0.0380, 60.00, 22);

-- Daily Metrics (30 days: March 13 - April 11, 2026)
INSERT INTO daily_metrics (tenant_id, date, channel, revenue, orders, page_views, visitors, conversion_rate) VALUES
  -- Shopify daily (66.3% of total)
  (1, '2026-03-13', 'shopify', 3180.00, 39, 3100, 2400, 0.0380),
  (1, '2026-03-14', 'shopify', 3420.00, 42, 3250, 2520, 0.0390),
  (1, '2026-03-15', 'shopify', 3650.00, 45, 3400, 2650, 0.0400),
  (1, '2026-03-16', 'shopify', 2890.00, 35, 2800, 2180, 0.0350),
  (1, '2026-03-17', 'shopify', 2750.00, 34, 2700, 2100, 0.0340),
  (1, '2026-03-18', 'shopify', 3540.00, 43, 3300, 2560, 0.0395),
  (1, '2026-03-19', 'shopify', 3280.00, 40, 3150, 2450, 0.0375),
  (1, '2026-03-20', 'shopify', 3620.00, 44, 3350, 2600, 0.0405),
  (1, '2026-03-21', 'shopify', 3150.00, 39, 3050, 2370, 0.0370),
  (1, '2026-03-22', 'shopify', 3480.00, 43, 3280, 2550, 0.0390),
  (1, '2026-03-23', 'shopify', 2980.00, 37, 2900, 2250, 0.0355),
  (1, '2026-03-24', 'shopify', 3350.00, 41, 3200, 2480, 0.0385),
  (1, '2026-03-25', 'shopify', 3720.00, 46, 3500, 2720, 0.0410),
  (1, '2026-03-26', 'shopify', 3100.00, 38, 3000, 2330, 0.0365),
  (1, '2026-03-27', 'shopify', 3250.00, 40, 3120, 2420, 0.0380),
  (1, '2026-03-28', 'shopify', 3580.00, 44, 3350, 2600, 0.0400),
  (1, '2026-03-29', 'shopify', 2820.00, 35, 2750, 2140, 0.0345),
  (1, '2026-03-30', 'shopify', 3460.00, 42, 3250, 2520, 0.0395),
  (1, '2026-03-31', 'shopify', 3680.00, 45, 3420, 2660, 0.0405),
  (1, '2026-04-01', 'shopify', 3200.00, 39, 3080, 2390, 0.0375),
  (1, '2026-04-02', 'shopify', 3380.00, 41, 3200, 2480, 0.0388),
  (1, '2026-04-03', 'shopify', 3560.00, 44, 3320, 2580, 0.0398),
  (1, '2026-04-04', 'shopify', 3050.00, 37, 2950, 2290, 0.0358),
  (1, '2026-04-05', 'shopify', 3420.00, 42, 3250, 2520, 0.0390),
  (1, '2026-04-06', 'shopify', 2900.00, 36, 2820, 2190, 0.0348),
  (1, '2026-04-07', 'shopify', 3300.00, 41, 3150, 2450, 0.0382),
  (1, '2026-04-08', 'shopify', 3640.00, 45, 3400, 2640, 0.0408),
  (1, '2026-04-09', 'shopify', 3180.00, 39, 3060, 2380, 0.0372),
  (1, '2026-04-10', 'shopify', 3350.00, 41, 3180, 2470, 0.0385),
  (1, '2026-04-11', 'shopify', 3500.00, 43, 3300, 2560, 0.0395),
  -- Amazon daily (19.5% of total)
  (1, '2026-03-13', 'amazon', 920.00, 12, 0, 0, 0),
  (1, '2026-03-14', 'amazon', 980.00, 13, 0, 0, 0),
  (1, '2026-03-15', 'amazon', 1050.00, 14, 0, 0, 0),
  (1, '2026-03-16', 'amazon', 850.00, 11, 0, 0, 0),
  (1, '2026-03-17', 'amazon', 820.00, 10, 0, 0, 0),
  (1, '2026-03-18', 'amazon', 1020.00, 13, 0, 0, 0),
  (1, '2026-03-19', 'amazon', 940.00, 12, 0, 0, 0),
  (1, '2026-03-20', 'amazon', 1080.00, 14, 0, 0, 0),
  (1, '2026-03-21', 'amazon', 900.00, 12, 0, 0, 0),
  (1, '2026-03-22', 'amazon', 1000.00, 13, 0, 0, 0),
  (1, '2026-03-23', 'amazon', 860.00, 11, 0, 0, 0),
  (1, '2026-03-24', 'amazon', 960.00, 12, 0, 0, 0),
  (1, '2026-03-25', 'amazon', 1100.00, 14, 0, 0, 0),
  (1, '2026-03-26', 'amazon', 880.00, 11, 0, 0, 0),
  (1, '2026-03-27', 'amazon', 930.00, 12, 0, 0, 0),
  (1, '2026-03-28', 'amazon', 1040.00, 13, 0, 0, 0),
  (1, '2026-03-29', 'amazon', 800.00, 10, 0, 0, 0),
  (1, '2026-03-30', 'amazon', 990.00, 13, 0, 0, 0),
  (1, '2026-03-31', 'amazon', 1060.00, 14, 0, 0, 0),
  (1, '2026-04-01', 'amazon', 910.00, 12, 0, 0, 0),
  (1, '2026-04-02', 'amazon', 970.00, 12, 0, 0, 0),
  (1, '2026-04-03', 'amazon', 1030.00, 13, 0, 0, 0),
  (1, '2026-04-04', 'amazon', 870.00, 11, 0, 0, 0),
  (1, '2026-04-05', 'amazon', 980.00, 13, 0, 0, 0),
  (1, '2026-04-06', 'amazon', 830.00, 11, 0, 0, 0),
  (1, '2026-04-07', 'amazon', 950.00, 12, 0, 0, 0),
  (1, '2026-04-08', 'amazon', 1050.00, 13, 0, 0, 0),
  (1, '2026-04-09', 'amazon', 900.00, 12, 0, 0, 0),
  (1, '2026-04-10', 'amazon', 960.00, 12, 0, 0, 0),
  (1, '2026-04-11', 'amazon', 1010.00, 13, 0, 0, 0),
  -- Google Ads daily (8.4% of total)
  (1, '2026-03-13', 'google_ads', 400.00, 5, 0, 0, 0),
  (1, '2026-03-14', 'google_ads', 430.00, 5, 0, 0, 0),
  (1, '2026-03-15', 'google_ads', 450.00, 6, 0, 0, 0),
  (1, '2026-03-16', 'google_ads', 370.00, 4, 0, 0, 0),
  (1, '2026-03-17', 'google_ads', 350.00, 4, 0, 0, 0),
  (1, '2026-03-18', 'google_ads', 440.00, 5, 0, 0, 0),
  (1, '2026-03-19', 'google_ads', 410.00, 5, 0, 0, 0),
  (1, '2026-03-20', 'google_ads', 460.00, 6, 0, 0, 0),
  (1, '2026-03-21', 'google_ads', 390.00, 5, 0, 0, 0),
  (1, '2026-03-22', 'google_ads', 430.00, 5, 0, 0, 0),
  (1, '2026-03-23', 'google_ads', 380.00, 5, 0, 0, 0),
  (1, '2026-03-24', 'google_ads', 420.00, 5, 0, 0, 0),
  (1, '2026-03-25', 'google_ads', 470.00, 6, 0, 0, 0),
  (1, '2026-03-26', 'google_ads', 400.00, 5, 0, 0, 0),
  (1, '2026-03-27', 'google_ads', 410.00, 5, 0, 0, 0),
  (1, '2026-03-28', 'google_ads', 450.00, 5, 0, 0, 0),
  (1, '2026-03-29', 'google_ads', 360.00, 4, 0, 0, 0),
  (1, '2026-03-30', 'google_ads', 440.00, 5, 0, 0, 0),
  (1, '2026-03-31', 'google_ads', 460.00, 6, 0, 0, 0),
  (1, '2026-04-01', 'google_ads', 400.00, 5, 0, 0, 0),
  (1, '2026-04-02', 'google_ads', 420.00, 5, 0, 0, 0),
  (1, '2026-04-03', 'google_ads', 440.00, 5, 0, 0, 0),
  (1, '2026-04-04', 'google_ads', 380.00, 5, 0, 0, 0),
  (1, '2026-04-05', 'google_ads', 430.00, 5, 0, 0, 0),
  (1, '2026-04-06', 'google_ads', 370.00, 5, 0, 0, 0),
  (1, '2026-04-07', 'google_ads', 410.00, 5, 0, 0, 0),
  (1, '2026-04-08', 'google_ads', 450.50, 6, 0, 0, 0),
  (1, '2026-04-09', 'google_ads', 400.00, 5, 0, 0, 0),
  (1, '2026-04-10', 'google_ads', 420.00, 5, 0, 0, 0),
  (1, '2026-04-11', 'google_ads', 430.00, 5, 0, 0, 0);

-- Demo Visitor Journey (vis_demo_8f3a2c)
INSERT INTO visitors (id, tenant_id, visitor_id, first_seen, last_seen, total_touchpoints, converted, conversion_date, conversion_value, time_to_convert_minutes) VALUES
  (1, 1, 'vis_demo_8f3a2c', '2026-04-07 10:12:00', '2026-04-10 17:38:00', 8, true, '2026-04-10 17:38:00', 49.99, 4642);

INSERT INTO touchpoints (tenant_id, visitor_id, event_type, page_url, page_title, source, medium, campaign, referrer, device, timestamp) VALUES
  (1, 1, 'page_view', 'https://winston-demo.myshopify.com/', 'Homepage', 'google', 'organic', NULL, 'https://google.com/search', 'desktop', '2026-04-07 10:12:00'),
  (1, 1, 'page_view', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'Premium Wireless Earbuds', NULL, NULL, NULL, NULL, 'desktop', '2026-04-07 10:14:00'),
  (1, 1, 'add_to_cart', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'Premium Wireless Earbuds', NULL, NULL, NULL, NULL, 'desktop', '2026-04-07 10:16:00'),
  (1, 1, 'page_view', 'https://winston-demo.myshopify.com/', 'Homepage', 'chatgpt.com', 'ai_referral', NULL, 'https://chatgpt.com/', 'mobile', '2026-04-08 15:30:00'),
  (1, 1, 'page_view', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'Premium Wireless Earbuds', NULL, NULL, NULL, NULL, 'mobile', '2026-04-08 15:32:00'),
  (1, 1, 'page_view', 'https://winston-demo.myshopify.com/', 'Homepage', 'mailchimp', 'email', 'spring_sale_2026', 'https://mail.google.com/', 'desktop', '2026-04-10 17:34:00'),
  (1, 1, 'page_view', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'Premium Wireless Earbuds', NULL, NULL, NULL, NULL, 'desktop', '2026-04-10 17:35:00'),
  (1, 1, 'purchase', 'https://winston-demo.myshopify.com/checkout/order-confirmed', 'Order Confirmed', NULL, NULL, NULL, NULL, 'desktop', '2026-04-10 17:38:00');

-- AI Referrals (32 orders, GBP3,300 revenue, 128 unique visitors)
-- ChatGPT: ~14 orders
INSERT INTO ai_referrals (tenant_id, visitor_id, ai_source, referrer_url, landing_page, device, converted, revenue, timestamp) VALUES
  (1, 1, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/', 'mobile', true, 49.99, '2026-04-08 15:30:00'),
  (1, NULL, 'chatgpt', 'https://chat.openai.com/', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'desktop', true, 49.99, '2026-03-20 09:15:00'),
  (1, NULL, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/products/organic-cotton-tshirt', 'desktop', true, 30.00, '2026-03-22 14:20:00'),
  (1, NULL, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/products/led-desk-lamp', 'mobile', true, 60.00, '2026-03-25 11:45:00'),
  (1, NULL, 'chatgpt', 'https://chat.openai.com/', 'https://winston-demo.myshopify.com/products/bluetooth-speaker', 'desktop', true, 50.00, '2026-03-28 16:30:00'),
  (1, NULL, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/products/leather-wallet', 'mobile', true, 50.00, '2026-03-30 10:00:00'),
  (1, NULL, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/products/water-bottle', 'desktop', true, 30.00, '2026-04-01 13:15:00'),
  (1, NULL, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'mobile', true, 49.99, '2026-04-03 09:45:00'),
  (1, NULL, 'chatgpt', 'https://chat.openai.com/', 'https://winston-demo.myshopify.com/products/yoga-mat', 'desktop', true, 40.00, '2026-04-05 15:20:00'),
  (1, NULL, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/products/led-desk-lamp', 'desktop', true, 60.00, '2026-04-07 11:30:00'),
  (1, NULL, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/products/organic-cotton-tshirt', 'mobile', true, 30.00, '2026-04-08 14:00:00'),
  (1, NULL, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/products/resistance-bands', 'desktop', true, 30.00, '2026-04-09 10:45:00'),
  (1, NULL, 'chatgpt', 'https://chat.openai.com/', 'https://winston-demo.myshopify.com/products/soy-candle', 'mobile', true, 25.00, '2026-04-10 16:15:00'),
  (1, NULL, 'chatgpt', 'https://chatgpt.com/', 'https://winston-demo.myshopify.com/products/bamboo-phone-stand', 'desktop', true, 25.00, '2026-04-11 09:00:00'),
  -- Perplexity: ~8 orders
  (1, NULL, 'perplexity', 'https://perplexity.ai/', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'desktop', true, 49.99, '2026-03-18 10:30:00'),
  (1, NULL, 'perplexity', 'https://perplexity.ai/', 'https://winston-demo.myshopify.com/products/led-desk-lamp', 'mobile', true, 60.00, '2026-03-23 14:15:00'),
  (1, NULL, 'perplexity', 'https://perplexity.ai/', 'https://winston-demo.myshopify.com/products/bluetooth-speaker', 'desktop', true, 50.00, '2026-03-27 09:45:00'),
  (1, NULL, 'perplexity', 'https://perplexity.ai/', 'https://winston-demo.myshopify.com/products/water-bottle', 'desktop', true, 30.00, '2026-04-01 11:00:00'),
  (1, NULL, 'perplexity', 'https://perplexity.ai/', 'https://winston-demo.myshopify.com/products/organic-cotton-tshirt', 'mobile', true, 30.00, '2026-04-04 15:30:00'),
  (1, NULL, 'perplexity', 'https://perplexity.ai/', 'https://winston-demo.myshopify.com/products/leather-wallet', 'desktop', true, 50.00, '2026-04-06 10:20:00'),
  (1, NULL, 'perplexity', 'https://perplexity.ai/', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'mobile', true, 49.99, '2026-04-09 13:45:00'),
  (1, NULL, 'perplexity', 'https://perplexity.ai/', 'https://winston-demo.myshopify.com/products/bamboo-phone-stand', 'desktop', true, 25.00, '2026-04-11 08:30:00'),
  -- Claude: ~5 orders
  (1, NULL, 'claude', 'https://claude.ai/', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'desktop', true, 49.99, '2026-03-21 11:00:00'),
  (1, NULL, 'claude', 'https://claude.ai/', 'https://winston-demo.myshopify.com/products/led-desk-lamp', 'mobile', true, 60.00, '2026-03-29 14:30:00'),
  (1, NULL, 'claude', 'https://claude.ai/', 'https://winston-demo.myshopify.com/products/bluetooth-speaker', 'desktop', true, 50.00, '2026-04-03 10:15:00'),
  (1, NULL, 'claude', 'https://claude.ai/', 'https://winston-demo.myshopify.com/products/organic-cotton-tshirt', 'desktop', true, 30.00, '2026-04-07 16:00:00'),
  (1, NULL, 'claude', 'https://claude.ai/', 'https://winston-demo.myshopify.com/products/water-bottle', 'mobile', true, 30.00, '2026-04-10 09:30:00'),
  -- Gemini: ~3 orders
  (1, NULL, 'gemini', 'https://gemini.google.com/', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'desktop', true, 49.99, '2026-03-26 13:00:00'),
  (1, NULL, 'gemini', 'https://gemini.google.com/', 'https://winston-demo.myshopify.com/products/yoga-mat', 'mobile', true, 40.00, '2026-04-02 10:45:00'),
  (1, NULL, 'gemini', 'https://gemini.google.com/', 'https://winston-demo.myshopify.com/products/led-desk-lamp', 'desktop', true, 60.00, '2026-04-08 15:00:00'),
  -- Copilot: ~2 orders
  (1, NULL, 'copilot', 'https://copilot.microsoft.com/', 'https://winston-demo.myshopify.com/products/leather-wallet', 'desktop', true, 50.00, '2026-04-05 11:30:00'),
  (1, NULL, 'copilot', 'https://copilot.microsoft.com/', 'https://winston-demo.myshopify.com/products/premium-wireless-earbuds', 'mobile', true, 49.99, '2026-04-10 14:00:00');
