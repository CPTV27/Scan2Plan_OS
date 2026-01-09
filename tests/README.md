# Scan2Plan OS - Playwright Test Suite

This directory contains comprehensive end-to-end tests for the Scan2Plan OS application.

## Test Files

| File | Description |
|------|-------------|
| `scan2plan.spec.ts` | Core application tests (dashboard, pipeline, production, settings) |
| `cpq-calculator.spec.ts` | CPQ Calculator tests (pricing, areas, travel, disciplines, margins) |
| `proposal-vault.spec.ts` | PandaDoc Proposal Vault tests (sync, extraction, review workflow) |
| `deal-ai-assistant.spec.ts` | AI Assistant tests (proposal generation, email drafting, objection handling) |
| `intelligence-engine.spec.ts` | Buyer Persona Intelligence Engine API tests |
| `finance-quickbooks.spec.ts` | Finance module and QuickBooks integration tests |
| `marketing-module.spec.ts` | Marketing module tests (personas, evidence vault, content queue) |
| `deal-workspace.spec.ts` | Deal Workspace tests (tabs, notes, timeline, CPQ, gates) |
| `agentic-features.spec.ts` | AI agentic features tests |
| `visual/visual-regression.spec.ts` | Visual regression tests |
| `workflows/*.spec.ts` | Workflow-specific tests |

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test tests/cpq-calculator.spec.ts
```

### Run tests with UI
```bash
npx playwright test --ui
```

### Run tests in headed mode
```bash
npx playwright test --headed
```

### Run specific test by name
```bash
npx playwright test -g "should calculate pricing"
```

### Run tests for specific feature
```bash
npx playwright test tests/cpq-calculator.spec.ts tests/proposal-vault.spec.ts
```

## Test Categories

### Unit/API Tests
Tests that directly hit API endpoints:
- Intelligence Engine API
- QuickBooks API
- CPQ API
- Marketing API

### UI Tests
Tests that interact with the browser:
- Dashboard navigation
- Form submissions
- Dialog interactions
- Kanban board operations

### Integration Tests
Tests that verify end-to-end workflows:
- Deal creation flow
- CPQ quote generation
- Proposal approval workflow

## Configuration

Tests are configured in `playwright.config.ts`:
- Base URL: `http://localhost:5000`
- Timeout: 60 seconds
- Browsers: Chromium, Firefox
- Authentication: Pre-authenticated via global setup

## Authentication

Tests use pre-authenticated sessions created in `global-setup.ts`:
- Admin user: Full access
- Field user: Limited access

Auth states are stored in `tests/.auth/`:
- `admin.json`
- `field.json`

## Test Data

Tests create their own test data with unique timestamps to avoid conflicts:
```typescript
const testClientName = `E2E Test Client ${Date.now()}`;
```

## Debugging

### View test report
```bash
npx playwright show-report
```

### Debug specific test
```bash
npx playwright test tests/cpq-calculator.spec.ts --debug
```

### Take screenshots on failure
Screenshots are automatically captured on failure and stored in `test-results/`.

## Best Practices

1. **Use data-testid attributes** - All interactive elements should have `data-testid`
2. **Wait for visibility** - Use `toBeVisible({ timeout: X })` for dynamic content
3. **Check for element existence** - Use `.catch(() => false)` for optional elements
4. **Unique test data** - Use timestamps to create unique test data
5. **Clean up** - Tests should be independent and not rely on state from other tests
