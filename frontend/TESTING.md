# Testing Infrastructure Documentation

This document outlines the comprehensive testing strategy and infrastructure for the Grantify.ai frontend application.

## Testing Strategy Overview

Our testing pyramid consists of:

1. **Unit Tests** (70%) - Fast, isolated component and function tests
2. **Integration Tests** (20%) - API interactions, context providers, user flows
3. **E2E Tests** (10%) - Full user journey testing across browsers
4. **Performance Tests** - Core Web Vitals and loading performance
5. **Accessibility Tests** - WCAG compliance and a11y standards

## Test Structure

```
frontend/
├── __tests__/
│   ├── mocks/
│   │   ├── handlers.js          # MSW API mock handlers
│   │   └── server.js            # MSW server setup
│   ├── utils/
│   │   └── test-utils.tsx       # Custom render functions and helpers
│   └── integration/
│       ├── search-flow.test.tsx # Search functionality integration tests
│       └── auth-context.test.tsx # Authentication context tests
├── src/
│   ├── components/
│   │   └── **/__tests__/        # Component unit tests
│   ├── hooks/
│   │   └── __tests__/           # Custom hook tests
│   └── ...
├── e2e/
│   ├── global-setup.ts          # E2E test setup
│   ├── global-teardown.ts       # E2E test cleanup
│   ├── grant-search.spec.ts     # Search flow E2E tests
│   ├── authentication.spec.ts   # Auth flow E2E tests
│   ├── performance.spec.ts      # Performance benchmarks
│   └── accessibility.spec.ts    # Accessibility compliance tests
├── jest.config.js               # Jest configuration
├── jest.setup.js                # Jest setup file
└── playwright.config.ts         # Playwright configuration
```

## Quick Start

### Installation

```bash
# Install all testing dependencies
npm install

# Install Playwright browsers
npm run playwright:install
```

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run performance tests
npm run test:perf

# Run accessibility tests
npm run test:a11y

# Run all tests (CI mode)
npm run test:all
```

## 🔧 Test Configuration

### Jest Configuration

Our Jest setup includes:

- **Next.js integration** with `next/jest`
- **TypeScript support** with proper transpilation
- **Module path mapping** for `@/` imports
- **Coverage thresholds** (70% minimum)
- **MSW integration** for API mocking
- **Custom matchers** for accessibility testing

### Playwright Configuration

Our E2E testing covers:

- **Multiple browsers**: Chromium, Firefox, WebKit
- **Mobile testing**: iPhone, Android viewports
- **Performance monitoring**: Core Web Vitals
- **Accessibility testing**: axe-core integration
- **Visual regression**: Screenshot comparisons
- **Network interception**: API mocking and testing

## Test Types

### Unit Tests

**Location**: `src/**/__tests__/`

**Purpose**: Test individual components and functions in isolation

**Example**:
```typescript
// GrantCard.test.tsx
import { render, screen } from '../../../__tests__/utils/test-utils'
import GrantCard from '../GrantCard'

describe('GrantCard', () => {
  it('renders grant information correctly', () => {
    render(<GrantCard {...mockGrantProps} />)
    
    expect(screen.getByText('Test Grant Title')).toBeInTheDocument()
    expect(screen.getByText('$500K')).toBeInTheDocument()
  })
})
```

### Integration Tests

**Location**: `__tests__/integration/`

**Purpose**: Test component interactions, API calls, and context providers

**Example**:
```typescript
// search-flow.test.tsx
describe('Search Flow Integration', () => {
  it('completes full search flow successfully', async () => {
    const { user } = render(<SearchPage />)
    
    await user.type(searchInput, 'cancer research')
    await user.click(searchButton)
    
    await waitFor(() => {
      expect(screen.getByText('Matched Grants')).toBeInTheDocument()
    })
  })
})
```

### E2E Tests

**Location**: `e2e/`

**Purpose**: Test complete user journeys across real browsers

**Example**:
```typescript
// grant-search.spec.ts
test('should perform basic grant search', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder(/Search grants/).fill('research')
  await page.getByRole('button', { name: /search/i }).click()
  
  await expect(page.getByText('Matched Grants')).toBeVisible()
})
```

## Test Coverage

### Coverage Thresholds

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Key Coverage Areas

- **Components**: All UI components tested
- **Hooks**: Custom hooks with edge cases
- **Utils**: Utility functions and formatters
- **API Client**: Network layer and caching
- **Context Providers**: State management

## Testing Best Practices

### Unit Testing

1. **Use descriptive test names**: `should display error message when API fails`
2. **Test behavior, not implementation**: Focus on what users see
3. **Mock external dependencies**: Use MSW for API calls
4. **Test edge cases**: Empty states, error conditions, loading states
5. **Keep tests isolated**: Each test should be independent

### Integration Testing

1. **Test user workflows**: Complete interactions from start to finish
2. **Use realistic data**: Mock responses that match production
3. **Test context interactions**: How components work together
4. **Verify side effects**: API calls, state updates, redirects

### E2E Testing

1. **Test critical paths**: Core user journeys that must work
2. **Use stable selectors**: Prefer `data-testid` or semantic roles
3. **Handle async operations**: Proper waiting for elements
4. **Test across browsers**: Ensure cross-browser compatibility
5. **Keep tests maintainable**: Page object patterns for complex flows

## Performance Testing

### Core Web Vitals

Our performance tests monitor:

- **First Contentful Paint (FCP)**: < 2.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Bundle Size Monitoring

- **JavaScript bundles**: < 500KB total
- **CSS bundles**: < 100KB total
- **Image optimization**: WebP/AVIF formats
- **Code splitting**: Dynamic imports for routes

## Accessibility Testing

### Automated Testing

- **axe-core**: Automated a11y rule checking
- **WCAG compliance**: AA standard adherence
- **Color contrast**: 4.5:1 minimum ratio
- **Keyboard navigation**: Tab order and focus management

### Manual Testing

- **Screen reader**: NVDA/JAWS compatibility
- **Keyboard only**: No mouse navigation
- **High contrast**: Windows high contrast mode
- **Zoom**: 200% zoom level usability

## CI/CD Integration

### GitHub Actions

Our CI pipeline includes:

1. **Lint & Type Check**: Code quality validation
2. **Unit Tests**: Fast feedback on component changes
3. **Integration Tests**: API and context testing
4. **Build Verification**: Ensure production builds work
5. **E2E Tests**: Cross-browser user journey testing
6. **Performance Tests**: Core Web Vitals monitoring
7. **Accessibility Tests**: a11y compliance checking
8. **Security Scan**: Dependency vulnerability checks

### Quality Gates

Tests must pass before:

- **Pull Request Merge**: All tests green
- **Production Deployment**: Full test suite + smoke tests
- **Dependency Updates**: Security and compatibility checks

## Debugging Tests

### Jest Debugging

```bash
# Debug specific test
npm test -- --testNamePattern="GrantCard" --verbose

# Run in watch mode with coverage
npm run test:watch -- --coverage

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Debugging

```bash
# Run with browser visible
npm run test:e2e:headed

# Debug mode with step-by-step
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# Run specific test file
npx playwright test e2e/grant-search.spec.ts
```

### Common Issues

1. **Flaky E2E tests**: Add proper waits, avoid hard-coded timeouts
2. **Memory leaks**: Clean up timers, subscriptions in teardown
3. **Mock mismatches**: Ensure MSW handlers match API contracts
4. **Timeout issues**: Increase timeouts for slow operations

## 📊 Test Reporting

### Coverage Reports

- **HTML Report**: `coverage/lcov-report/index.html`
- **JSON Report**: `coverage/coverage-final.json`
- **LCOV Report**: `coverage/lcov.info` (for CI tools)

### E2E Reports

- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `test-results/results.json`
- **Screenshots**: `test-results/screenshots/`
- **Videos**: `test-results/videos/`

### CI Integration

- **Codecov**: Coverage tracking and PR comments
- **GitHub**: Test status checks and artifacts
- **Slack**: Deployment notifications (optional)

## 🔄 Maintenance

### Regular Tasks

1. **Update dependencies**: Monthly security updates
2. **Review flaky tests**: Weekly stability check
3. **Performance benchmarks**: Monitor Core Web Vitals trends
4. **Coverage analysis**: Identify untested code paths

### Test Data Management

- **Mock data**: Keep in sync with API schemas
- **Test users**: Maintain test accounts for E2E
- **Environment parity**: Staging mirrors production

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Core Web Vitals](https://web.dev/vitals/)

---

For questions or issues with the testing infrastructure, please contact the development team or create an issue in the repository.