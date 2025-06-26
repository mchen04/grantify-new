#!/bin/bash

# ===========================================
# Grantify.ai Production Deployment Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.prod"
BACKUP_DIR="/tmp/grantify-backup-$(date +%Y%m%d-%H%M%S)"

# Functions
log_info() {
    echo -e "${BLUE}INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

check_requirements() {
    log_info "Checking deployment requirements..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    # Check if production environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Production environment file not found: $ENV_FILE"
        log_info "Please copy .env.prod.example to .env.prod and configure it."
        exit 1
    fi
    
    # Check if SSL certificates exist (if not first deployment)
    if [ -f "/etc/letsencrypt/live/$(grep DOMAIN= $ENV_FILE | cut -d= -f2)/fullchain.pem" ]; then
        log_success "SSL certificates found"
    else
        log_warning "SSL certificates not found. They will be created during deployment."
    fi
    
    log_success "All requirements met!"
}

validate_environment() {
    log_info "Validating environment configuration..."
    
    # Source the environment file
    source "$ENV_FILE"
    
    # Check required variables
    required_vars=(
        "DOMAIN"
        "SSL_EMAIL"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_KEY"
        "JWT_SECRET"
        "GOOGLE_AI_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate JWT secret length
    if [ ${#JWT_SECRET} -lt 32 ]; then
        log_error "JWT_SECRET must be at least 32 characters long"
        exit 1
    fi
    
    # Check if domain is not placeholder
    if [ "$DOMAIN" = "yourdomain.com" ]; then
        log_error "Please update DOMAIN in $ENV_FILE with your actual domain"
        exit 1
    fi
    
    log_success "Environment configuration validated!"
}

create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current containers if running
    if docker ps --format 'table {{.Names}}' | grep -q grantify; then
        log_info "Backing up current deployment..."
        docker-compose logs > "$BACKUP_DIR/logs.txt" 2>/dev/null || true
        docker-compose config > "$BACKUP_DIR/docker-compose.yml" 2>/dev/null || true
    fi
    
    # Backup environment files
    cp "$ENV_FILE" "$BACKUP_DIR/" 2>/dev/null || true
    cp "$PROJECT_DIR/.env.example" "$BACKUP_DIR/" 2>/dev/null || true
    
    log_success "Backup created at $BACKUP_DIR"
}

setup_ssl() {
    source "$ENV_FILE"
    
    log_info "Setting up SSL certificates for $DOMAIN..."
    
    # Check if certificates already exist
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        log_info "SSL certificates already exist for $DOMAIN"
        return 0
    fi
    
    # Run SSL setup script
    if [ -f "$SCRIPT_DIR/setup-ssl.sh" ]; then
        log_info "Running SSL setup script..."
        sudo "$SCRIPT_DIR/setup-ssl.sh" "$DOMAIN" "$SSL_EMAIL"
    else
        log_warning "SSL setup script not found. You'll need to set up SSL manually."
        log_info "Run: sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN"
    fi
}

build_and_deploy() {
    log_info "Building and deploying application..."
    
    cd "$PROJECT_DIR"
    
    # Load environment variables
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    # Stop existing containers
    if docker ps --format 'table {{.Names}}' | grep -q grantify; then
        log_info "Stopping existing containers..."
        docker-compose -f docker-compose.prod.yml down
    fi
    
    # Build new images
    log_info "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check health
    for i in {1..10}; do
        if docker-compose -f docker-compose.prod.yml ps | grep -q "Up (healthy)"; then
            log_success "Services are healthy!"
            break
        fi
        
        if [ $i -eq 10 ]; then
            log_error "Services failed to become healthy"
            docker-compose -f docker-compose.prod.yml logs
            exit 1
        fi
        
        log_info "Waiting for services... ($i/10)"
        sleep 10
    done
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    source "$ENV_FILE"
    
    # Test health endpoints
    if curl -f "http://localhost/health" > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # Test HTTPS if certificates exist
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        if curl -f "https://$DOMAIN/health" > /dev/null 2>&1; then
            log_success "HTTPS health check passed"
        else
            log_warning "HTTPS health check failed - may need time to propagate"
        fi
    fi
    
    # Show running containers
    log_info "Running containers:"
    docker-compose -f docker-compose.prod.yml ps
    
    log_success "Deployment verification completed!"
}

cleanup() {
    log_info "Cleaning up..."
    
    # Remove old images
    docker image prune -f > /dev/null 2>&1 || true
    
    # Remove old volumes
    docker volume prune -f > /dev/null 2>&1 || true
    
    log_success "Cleanup completed!"
}

show_deployment_info() {
    source "$ENV_FILE"
    
    echo ""
    echo "Deployment Complete!"
    echo "===================="
    echo "Domain: https://$DOMAIN"
    echo "API: https://$DOMAIN/api"
    echo "Health: https://$DOMAIN/health"
    echo ""
    echo "Monitoring:"
    echo "   - Logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "   - Status: docker-compose -f docker-compose.prod.yml ps"
    echo "   - Stats: docker stats"
    echo ""
    echo "Management Commands:"
    echo "   - Restart: docker-compose -f docker-compose.prod.yml restart"
    echo "   - Update: ./scripts/deploy.sh"
    echo "   - SSL Renew: sudo certbot renew"
    echo ""
    echo "SSL Grade: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo ""
}

# Main deployment flow
main() {
    echo "Starting Grantify.ai Production Deployment"
    echo "============================================="
    
    check_requirements
    validate_environment
    create_backup
    setup_ssl
    build_and_deploy
    verify_deployment
    cleanup
    show_deployment_info
    
    log_success "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "check")
        check_requirements
        validate_environment
        ;;
    "ssl")
        source "$ENV_FILE"
        setup_ssl
        ;;
    "backup")
        create_backup
        ;;
    "deploy")
        main
        ;;
    *)
        echo "Usage: $0 [check|ssl|backup|deploy]"
        echo ""
        echo "Commands:"
        echo "  check   - Check requirements and validate environment"
        echo "  ssl     - Set up SSL certificates only"
        echo "  backup  - Create backup only"
        echo "  deploy  - Full deployment (default)"
        exit 1
        ;;
esac