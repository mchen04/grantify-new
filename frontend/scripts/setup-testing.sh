#!/bin/bash

# Testing Infrastructure Setup Script
# This script installs all testing dependencies and verifies the setup

set -e

echo "🧪 Setting up comprehensive testing infrastructure for Grantify.ai..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

print_status "Installing testing dependencies..."

# Install dependencies
npm install

print_success "Dependencies installed successfully!"

print_status "Installing Playwright browsers..."

# Install Playwright browsers
npx playwright install

print_success "Playwright browsers installed!"

print_status "Running initial test validation..."

# Run basic tests to verify setup
echo ""
echo "1. Running Jest configuration check..."
npm test -- --passWithNoTests --verbose

echo ""
echo "2. Running TypeScript check..."
npx tsc --noEmit

echo ""
echo "3. Running ESLint..."
npm run lint

echo ""
echo "4. Testing build process..."
npm run build

echo ""
echo "5. Running unit tests..."
npm run test:ci

echo ""
echo "6. Running Playwright installation check..."
npx playwright --version

echo ""
print_success "All tests passed! Testing infrastructure is ready."

echo ""
echo "📋 Testing Commands Summary:"
echo ""
echo "Unit Tests:"
echo "  npm test                    # Run unit tests"
echo "  npm run test:watch          # Run in watch mode"
echo "  npm run test:coverage       # Run with coverage"
echo ""
echo "Integration Tests:"
echo "  npm run test:integration    # Run integration tests"
echo ""
echo "E2E Tests:"
echo "  npm run test:e2e            # Run all E2E tests"
echo "  npm run test:e2e:ui         # Run with Playwright UI"
echo "  npm run test:e2e:headed     # Run with browser visible"
echo "  npm run test:e2e:debug      # Debug mode"
echo ""
echo "Specialized Tests:"
echo "  npm run test:perf           # Performance tests"
echo "  npm run test:a11y           # Accessibility tests"
echo ""
echo "All Tests:"
echo "  npm run test:all            # Run complete test suite"
echo ""
echo "📊 Coverage Reports:"
echo "  coverage/lcov-report/index.html    # HTML coverage report"
echo "  playwright-report/index.html       # E2E test report"
echo ""
echo "📖 Documentation:"
echo "  TESTING.md                  # Comprehensive testing guide"
echo ""
print_success "Testing infrastructure setup complete! 🎉"

echo ""
echo "Next steps:"
echo "1. Review TESTING.md for detailed documentation"
echo "2. Run 'npm run test:all' to execute the full test suite"
echo "3. Set up GitHub Actions for CI/CD (workflows already configured)"
echo "4. Configure Codecov for coverage tracking"
echo ""
print_warning "Remember to update test data when API schemas change!"