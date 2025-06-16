#!/bin/bash

# ===========================================
# Production Verification Script
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.prod"

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

test_health_endpoint() {
    local url="$1"
    local name="$2"
    
    log_info "Testing $name health endpoint: $url"
    
    if curl -f -s "$url" > /dev/null; then
        log_success "$name health check passed"
        return 0
    else
        log_error "$name health check failed"
        return 1
    fi
}

test_ssl_grade() {
    local domain="$1"
    
    log_info "Testing SSL configuration for $domain"
    
    # Test SSL connection
    if echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates; then
        log_success "SSL certificate is valid"
        
        # Check SSL strength
        local ssl_result=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | grep "Cipher is")
        log_info "SSL Cipher: $ssl_result"
        
        log_info "Check full SSL grade at: https://www.ssllabs.com/ssltest/analyze.html?d=$domain"
    else
        log_error "SSL certificate test failed"
        return 1
    fi
}

test_security_headers() {
    local url="$1"
    
    log_info "Testing security headers for $url"
    
    local headers=$(curl -s -I "$url")
    
    # Check for security headers
    if echo "$headers" | grep -qi "strict-transport-security"; then
        log_success "HSTS header present"
    else
        log_warning "HSTS header missing"
    fi
    
    if echo "$headers" | grep -qi "x-frame-options"; then
        log_success "X-Frame-Options header present"
    else
        log_warning "X-Frame-Options header missing"
    fi
    
    if echo "$headers" | grep -qi "x-content-type-options"; then
        log_success "X-Content-Type-Options header present"
    else
        log_warning "X-Content-Type-Options header missing"
    fi
    
    if echo "$headers" | grep -qi "content-security-policy"; then
        log_success "Content-Security-Policy header present"
    else
        log_warning "Content-Security-Policy header missing"
    fi
}

test_performance() {
    local url="$1"
    
    log_info "Testing performance for $url"
    
    # Test response time
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" "$url")
    local time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        log_success "Response time: ${time_ms}ms (Good)"
    elif (( $(echo "$response_time < 5.0" | bc -l) )); then
        log_warning "Response time: ${time_ms}ms (Acceptable)"
    else
        log_error "Response time: ${time_ms}ms (Slow)"
    fi
    
    # Test compression
    if curl -s -H "Accept-Encoding: gzip" -I "$url" | grep -qi "content-encoding.*gzip"; then
        log_success "Gzip compression enabled"
    else
        log_warning "Gzip compression not detected"
    fi
}

test_containers() {
    log_info "Testing container health"
    
    # Check if containers are running
    if docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps | grep -q "Up"; then
        log_success "Containers are running"
        
        # Show container status
        echo ""
        log_info "Container status:"
        docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps
        echo ""
        
        # Check resource usage
        log_info "Resource usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
        echo ""
    else
        log_error "Some containers are not running"
        docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps
        return 1
    fi
}

main() {
    echo "🔍 Grantify.ai Production Verification"
    echo "======================================"
    
    # Check if production environment exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Production environment file not found: $ENV_FILE"
        exit 1
    fi
    
    # Load environment
    source "$ENV_FILE"
    
    # Verify domain is set
    if [ "$DOMAIN" = "yourdomain.com" ] || [ -z "$DOMAIN" ]; then
        log_error "Please set your actual domain in $ENV_FILE"
        exit 1
    fi
    
    echo ""
    log_info "Testing domain: $DOMAIN"
    echo ""
    
    # Test containers
    test_containers
    
    # Test health endpoints
    test_health_endpoint "http://localhost/health" "Backend (Local)"
    test_health_endpoint "http://localhost/api/health" "Frontend (Local)"
    
    # Test external endpoints if SSL is set up
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        test_health_endpoint "https://$DOMAIN/health" "Backend (External)"
        test_health_endpoint "https://$DOMAIN/api/health" "Frontend (External)"
        test_ssl_grade "$DOMAIN"
        test_security_headers "https://$DOMAIN"
        test_performance "https://$DOMAIN"
    else
        log_warning "SSL certificates not found - skipping external tests"
        log_info "Run: sudo ./scripts/setup-ssl.sh $DOMAIN to set up SSL"
    fi
    
    echo ""
    log_success "Verification completed!"
    echo ""
    
    # Summary
    echo "📊 Quick Links:"
    echo "   🌐 Website: https://$DOMAIN"
    echo "   🔧 API: https://$DOMAIN/api"
    echo "   🏥 Health: https://$DOMAIN/health"
    echo "   📋 SSL Test: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo "   🔒 Security Test: https://securityheaders.com/?q=$DOMAIN"
    echo "   ⚡ Speed Test: https://pagespeed.web.dev/report?url=https://$DOMAIN"
    echo ""
}

main "$@"