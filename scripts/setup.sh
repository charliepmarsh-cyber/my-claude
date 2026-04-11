#!/bin/bash
echo "PulseCommerce Setup"
echo "======================"
cp .env.example .env
echo ""
echo "1. Edit .env with your credentials"
echo "2. Run: docker-compose up -d"
echo "3. Access n8n at http://localhost:5678"
echo "4. Import workflows from n8n-workflows/"
echo "5. Access PulseCommerce at http://localhost:3000"
echo ""
echo "Demo account: demo@pulsecommerce.io / demo123"
