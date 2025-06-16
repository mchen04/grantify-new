#!/bin/bash

# ===========================================
# SSL Certificate Setup Script for Grantify.ai
# ===========================================
# This script sets up SSL certificates using Let's Encrypt

set -e

# Configuration
DOMAIN="${1:-yourdomain.com}"
EMAIL="${2:-your-email@example.com}"
WEBROOT="/var/www/certbot"

echo "🔐 Setting up SSL certificates for $DOMAIN"
echo "📧 Contact email: $EMAIL"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root (use sudo)"
    exit 1
fi

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    
    # Detect OS and install certbot
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL/Fedora
        yum install -y epel-release
        yum install -y certbot python3-certbot-nginx
    else
        echo "❌ Unsupported operating system. Please install certbot manually."
        exit 1
    fi
fi

# Create webroot directory for ACME challenge
mkdir -p "$WEBROOT"
chown -R www-data:www-data "$WEBROOT" 2>/dev/null || chown -R nginx:nginx "$WEBROOT" 2>/dev/null || true

# Stop nginx temporarily for standalone mode (if running)
if systemctl is-active --quiet nginx; then
    echo "🛑 Stopping nginx temporarily..."
    systemctl stop nginx
    RESTART_NGINX=true
else
    RESTART_NGINX=false
fi

# Generate SSL certificate
echo "🔄 Requesting SSL certificate for $DOMAIN..."
certbot certonly \
    --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --domains "$DOMAIN,www.$DOMAIN" \
    --keep-until-expiring \
    --non-interactive

# Check if certificate was generated successfully
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "✅ SSL certificate generated successfully!"
    
    # Set proper permissions
    chmod 755 /etc/letsencrypt/live
    chmod 755 /etc/letsencrypt/archive
    
    # Create certificate info file
    cat > "/tmp/ssl-info-$DOMAIN.txt" << EOF
SSL Certificate Information for $DOMAIN
=====================================
Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem
Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem
Chain: /etc/letsencrypt/live/$DOMAIN/chain.pem

Update your nginx configuration to use these paths:
ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;

Certificate expires: $(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
EOF
    
    echo "📄 Certificate information saved to /tmp/ssl-info-$DOMAIN.txt"
    cat "/tmp/ssl-info-$DOMAIN.txt"
    
else
    echo "❌ Failed to generate SSL certificate!"
    exit 1
fi

# Set up automatic renewal
echo "⏰ Setting up automatic certificate renewal..."

# Create renewal cron job if it doesn't exist
CRON_JOB="0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'"
(crontab -l 2>/dev/null | grep -v "certbot renew" ; echo "$CRON_JOB") | crontab -

# Test renewal (dry run)
echo "🧪 Testing certificate renewal..."
certbot renew --dry-run

# Restart nginx if it was running
if [ "$RESTART_NGINX" = true ]; then
    echo "🔄 Starting nginx..."
    systemctl start nginx
    systemctl enable nginx
fi

# Create nginx SSL configuration snippet
cat > "/etc/nginx/snippets/ssl-$DOMAIN.conf" << EOF
# SSL configuration for $DOMAIN
ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;

# SSL optimization
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
EOF

echo "📝 Nginx SSL snippet created at /etc/nginx/snippets/ssl-$DOMAIN.conf"
echo ""
echo "🎉 SSL setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your nginx configuration to use the SSL certificate"
echo "2. Replace 'yourdomain.com' in nginx.prod.conf with your actual domain"
echo "3. Test nginx configuration: nginx -t"
echo "4. Reload nginx: systemctl reload nginx"
echo "5. Test SSL: https://$DOMAIN"
echo ""
echo "📋 SSL Grade Test: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"