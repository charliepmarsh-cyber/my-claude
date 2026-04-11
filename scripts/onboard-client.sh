#!/bin/bash
set -e

echo "============================================"
echo "  PulseCommerce Client Onboarding"
echo "============================================"
echo ""

# 1. Brand name and slug
read -p "Client brand name: " BRAND_NAME
SLUG=$(echo "$BRAND_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
echo "Generated slug: $SLUG"
echo ""

# 2. Shopify credentials
read -p "Shopify store URL (e.g., brand.myshopify.com): " SHOPIFY_URL
read -p "Shopify access token (shpat_...): " SHOPIFY_TOKEN
echo ""

# Validate Shopify credentials
echo "Validating Shopify credentials..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Shopify-Access-Token: $SHOPIFY_TOKEN" \
  "https://$SHOPIFY_URL/admin/api/2024-01/shop.json" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "Shopify: VALID"
else
  echo "WARNING: Shopify validation returned status $HTTP_STATUS"
  read -p "Continue anyway? (y/n): " CONTINUE
  if [ "$CONTINUE" != "y" ]; then
    echo "Aborting."
    exit 1
  fi
fi
echo ""

# 3. Additional channels
echo "Select additional channels to connect:"
read -p "  Amazon SP-API? (y/n): " AMAZON
read -p "  Google Ads? (y/n): " GOOGLE_ADS
read -p "  Mailchimp? (y/n): " MAILCHIMP
read -p "  Social Media? (y/n): " SOCIAL
echo ""

# 4. Collect API credentials for selected channels
AMAZON_CONFIG="{}"
GOOGLE_ADS_CONFIG="{}"
MAILCHIMP_CONFIG="{}"

if [ "$AMAZON" = "y" ]; then
  read -p "Amazon SP-API Refresh Token: " AMAZON_TOKEN
  read -p "Amazon SP-API Client ID: " AMAZON_CLIENT_ID
  read -p "Amazon SP-API Client Secret: " AMAZON_CLIENT_SECRET
  AMAZON_CONFIG="{\"refresh_token\": \"$AMAZON_TOKEN\", \"client_id\": \"$AMAZON_CLIENT_ID\", \"client_secret\": \"$AMAZON_CLIENT_SECRET\"}"
fi

if [ "$GOOGLE_ADS" = "y" ]; then
  read -p "Google Ads Customer ID: " GADS_CUSTOMER_ID
  read -p "Google Ads Developer Token: " GADS_DEV_TOKEN
  read -p "Google Ads OAuth Client ID: " GADS_CLIENT_ID
  read -p "Google Ads OAuth Client Secret: " GADS_CLIENT_SECRET
  GOOGLE_ADS_CONFIG="{\"customer_id\": \"$GADS_CUSTOMER_ID\", \"developer_token\": \"$GADS_DEV_TOKEN\", \"client_id\": \"$GADS_CLIENT_ID\", \"client_secret\": \"$GADS_CLIENT_SECRET\"}"
fi

if [ "$MAILCHIMP" = "y" ]; then
  read -p "Mailchimp API Key: " MC_API_KEY
  read -p "Mailchimp List ID: " MC_LIST_ID
  MAILCHIMP_CONFIG="{\"api_key\": \"$MC_API_KEY\", \"list_id\": \"$MC_LIST_ID\"}"
fi

# 5. Deployment type
echo ""
echo "Deployment type:"
echo "  1. SaaS (multi-tenant, shared infrastructure)"
echo "  2. Custom (dedicated, client owns infrastructure)"
read -p "Select (1/2): " DEPLOY_TYPE

if [ "$DEPLOY_TYPE" = "2" ]; then
  DEPLOYMENT="custom"
else
  DEPLOYMENT="saas"
fi

# 6. Select plan
echo ""
echo "Plan tier:"
echo "  1. Starter (GBP1,500 - Shopify + 1 channel)"
echo "  2. Growth (GBP3,500 - Shopify + 3 channels)"
echo "  3. Enterprise (GBP6,000 - All channels)"
read -p "Select (1/2/3): " PLAN_CHOICE

case $PLAN_CHOICE in
  1) PLAN="starter" ;;
  2) PLAN="growth" ;;
  3) PLAN="enterprise" ;;
  *) PLAN="starter" ;;
esac

echo ""
echo "============================================"
echo "  Configuration Summary"
echo "============================================"
echo "Brand: $BRAND_NAME"
echo "Slug: $SLUG"
echo "Plan: $PLAN"
echo "Deployment: $DEPLOYMENT"
echo "Shopify: $SHOPIFY_URL"
echo "Amazon: $AMAZON"
echo "Google Ads: $GOOGLE_ADS"
echo "Mailchimp: $MAILCHIMP"
echo "Social: $SOCIAL"
echo "============================================"
read -p "Proceed? (y/n): " PROCEED

if [ "$PROCEED" != "y" ]; then
  echo "Aborting."
  exit 0
fi

# 7. Create tenant in PostgreSQL
echo ""
echo "Creating tenant record..."

API_KEYS=$(cat <<EOF
{
  "shopify": {"store_url": "$SHOPIFY_URL", "access_token": "$SHOPIFY_TOKEN"},
  "amazon": $AMAZON_CONFIG,
  "google_ads": $GOOGLE_ADS_CONFIG,
  "mailchimp": $MAILCHIMP_CONFIG
}
EOF
)

PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U $POSTGRES_USER -d pulsecommerce -c "
INSERT INTO tenants (name, slug, plan, deployment_type, api_keys, config)
VALUES ('$BRAND_NAME', '$SLUG', '$PLAN', '$DEPLOYMENT', '$API_KEYS'::jsonb, '{\"currency\": \"GBP\"}'::jsonb)
RETURNING id;
"

# Get the tenant ID
TENANT_ID=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U $POSTGRES_USER -d pulsecommerce -t -c "SELECT id FROM tenants WHERE slug='$SLUG';")
TENANT_ID=$(echo $TENANT_ID | tr -d ' ')

# 8. Create admin user
ADMIN_EMAIL="${SLUG}@pulsecommerce.io"
TEMP_PASSWORD=$(openssl rand -base64 12)
echo "Creating admin user: $ADMIN_EMAIL"

PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U $POSTGRES_USER -d pulsecommerce -c "
INSERT INTO users (tenant_id, email, password_hash, name, role)
VALUES ($TENANT_ID, '$ADMIN_EMAIL', 'TEMP_$TEMP_PASSWORD', '$BRAND_NAME Admin', 'admin');
"

# 9. Set up channel records
echo "Setting up channels..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U $POSTGRES_USER -d pulsecommerce -c "
INSERT INTO channels (tenant_id, name, status) VALUES
  ($TENANT_ID, 'shopify', 'connected')
  $([ "$AMAZON" = "y" ] && echo ", ($TENANT_ID, 'amazon', 'connected')")
  $([ "$GOOGLE_ADS" = "y" ] && echo ", ($TENANT_ID, 'google_ads', 'connected')")
  $([ "$MAILCHIMP" = "y" ] && echo ", ($TENANT_ID, 'mailchimp', 'connected')")
  $([ "$SOCIAL" = "y" ] && echo ", ($TENANT_ID, 'social', 'connected')")
;
"

# 10. Generate client-specific config
echo "Generating white-label config..."
mkdir -p config/clients

cat > config/clients/${SLUG}.json <<EOF
{
  "tenant_id": $TENANT_ID,
  "branding": {
    "appName": "$BRAND_NAME Analytics",
    "primaryColor": "#3b82f6",
    "sidebarColor": "#1a1f36"
  },
  "features": $(cat config/feature-flags.json | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['$PLAN']))" 2>/dev/null || echo '{}')
}
EOF

echo ""
echo "============================================"
echo "  Onboarding Complete!"
echo "============================================"
echo ""
echo "Dashboard URL: http://localhost:3000"
echo "Login Email:   $ADMIN_EMAIL"
echo "Login Password: $TEMP_PASSWORD"
echo ""
echo "Next steps:"
echo "  1. Import n8n workflows (if not already done)"
echo "  2. Trigger initial Shopify data sync"
echo "  3. Verify data in dashboard"
echo "  4. Schedule client demo call"
echo ""
