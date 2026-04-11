-- PulseCommerce Database Schema
-- Multi-tenant e-commerce intelligence platform

-- Multi-tenant support
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(20) DEFAULT 'starter', -- starter, growth, enterprise, pro, scale
  deployment_type VARCHAR(20) DEFAULT 'saas', -- saas, custom
  config JSONB DEFAULT '{}',
  api_keys JSONB DEFAULT '{}', -- encrypted store for Shopify, Google Ads, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'viewer', -- admin, editor, viewer
  created_at TIMESTAMP DEFAULT NOW()
);

-- Core tables (all tenant-scoped)
CREATE TABLE channels (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  name VARCHAR(50) NOT NULL, -- shopify, amazon, google_ads, mailchimp, social
  status VARCHAR(20) DEFAULT 'disconnected', -- connected, phase_2, disconnected
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  external_id VARCHAR(255),
  channel_id INTEGER REFERENCES channels(id),
  order_date TIMESTAMP NOT NULL,
  revenue DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  customer_email VARCHAR(255),
  customer_id VARCHAR(255),
  is_returning_customer BOOLEAN DEFAULT false,
  source VARCHAR(100),
  medium VARCHAR(100),
  campaign VARCHAR(255),
  products JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, external_id)
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(50),
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

CREATE TABLE product_metrics (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  product_id INTEGER REFERENCES products(id),
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  channel VARCHAR(50),
  UNIQUE(tenant_id, product_id, date, channel)
);

CREATE TABLE visitors (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  visitor_id VARCHAR(100) NOT NULL,
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  total_touchpoints INTEGER DEFAULT 0,
  converted BOOLEAN DEFAULT false,
  conversion_date TIMESTAMP,
  conversion_value DECIMAL(10,2),
  time_to_convert_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, visitor_id)
);

CREATE TABLE touchpoints (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  visitor_id INTEGER REFERENCES visitors(id),
  event_type VARCHAR(50) NOT NULL, -- page_view, add_to_cart, purchase
  page_url VARCHAR(500),
  page_title VARCHAR(255),
  source VARCHAR(100),
  medium VARCHAR(100),
  campaign VARCHAR(255),
  referrer VARCHAR(500),
  device VARCHAR(20), -- desktop, mobile, tablet
  timestamp TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_referrals (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  visitor_id INTEGER REFERENCES visitors(id),
  ai_source VARCHAR(50) NOT NULL, -- chatgpt, perplexity, claude, gemini, copilot
  referrer_url VARCHAR(500),
  landing_page VARCHAR(500),
  device VARCHAR(20),
  converted BOOLEAN DEFAULT false,
  order_id INTEGER REFERENCES orders(id),
  revenue DECIMAL(10,2) DEFAULT 0,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE daily_metrics (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  date DATE NOT NULL,
  channel VARCHAR(50),
  revenue DECIMAL(10,2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  visitors INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  UNIQUE(tenant_id, date, channel)
);

CREATE TABLE google_ads_metrics (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  UNIQUE(tenant_id, date)
);

CREATE TABLE email_metrics (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  date DATE NOT NULL,
  campaign_name VARCHAR(255),
  campaign_id VARCHAR(100),
  subscribers INTEGER DEFAULT 0,
  open_rate DECIMAL(5,4) DEFAULT 0,
  click_rate DECIMAL(5,4) DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  new_subs INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE traffic_sources (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  date DATE NOT NULL,
  source VARCHAR(100) NOT NULL,
  visits INTEGER DEFAULT 0,
  UNIQUE(tenant_id, date, source)
);

-- Row Level Security for multi-tenancy
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_orders_tenant_date ON orders(tenant_id, order_date);
CREATE INDEX idx_orders_channel ON orders(channel_id);
CREATE INDEX idx_touchpoints_tenant_visitor ON touchpoints(tenant_id, visitor_id);
CREATE INDEX idx_touchpoints_timestamp ON touchpoints(timestamp);
CREATE INDEX idx_ai_referrals_tenant_source ON ai_referrals(tenant_id, ai_source);
CREATE INDEX idx_daily_metrics_tenant_date ON daily_metrics(tenant_id, date);
CREATE INDEX idx_traffic_sources_tenant_date ON traffic_sources(tenant_id, date);
CREATE INDEX idx_product_metrics_tenant ON product_metrics(tenant_id, product_id, date);
