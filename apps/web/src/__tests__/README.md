# Tests for Map, Boundary, and Tour Improvements

This directory contains tests for the improvements made to the map, boundary parsing, and tour loading functionality.

## Test Structure

### Unit Tests

#### `utils/__tests__/boundary.test.js`
Tests for boundary utility functions:
- `safeParseBoundary()` - Safe JSON parsing with validation
- `areBoundaryCoordinatesEqual()` - Compare boundary geometries
- `normalizeBoundary()` integration tests

Run with:
```bash
npm test utils/__tests__/boundary.test.js
```

#### `services/__tests__/api.test.js`
Tests for API service improvements:
- Tour URL validation improvements
- Error handling for invalid tours
- TourViewer error display logic

Run with:
```bash
npm test services/__tests__/api.test.js
```

### End-to-End Tests

#### `__tests__/e2e/map-tours.test.js`
Integration tests covering:
- Boundary polygon display and error handling
- Tour loading with timeout and retry logic
- Animation state management
- Mobile responsiveness
- Performance and memory leak prevention

Run with:
```bash
npm test __tests__/e2e/map-tours.test.js
```

## Test Coverage

The tests cover the following improvements:

### ✅ Boundary Parsing Safety
- Safe JSON parsing without crashes
- Validation of boundary structure
- Graceful handling of malformed data
- Coordinate comparison for animation optimization

### ✅ Tour Loading Reliability
- Whitelist-based URL validation
- Timeout handling (15s for tours, 10s for Pano2VR)
- Retry logic with exponential backoff
- Better error messages instead of redirects

### ✅ Animation State Management
- Unified state to prevent conflicts
- Proper cleanup of timeouts/intervals
- RequestAnimationFrame for smooth animations
- Prevention of race conditions

### ✅ Mobile Optimization
- Touch device detection
- Connection quality awareness
- Larger touch targets for mobile
- Skip animations on slow connections

## Running All Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suites
npm test -- --testPathPattern="boundary"
npm test -- --testPathPattern="api"
npm test -- --testPathPattern="e2e"
```

## Mock Setup

Tests use Jest mocks for:
- Browser APIs (geolocation, requestAnimationFrame)
- Network requests (API calls)
- DOM elements (iframes, timeouts)

## Continuous Integration

These tests should be run in CI to ensure:
- No regressions in boundary parsing
- Tour loading works reliably
- Animation states don't conflict
- Mobile experience remains smooth

## Test Data

Tests use realistic mock data including:
- Valid GeoJSON polygons for Chile properties
- Various tour URL formats (valid and invalid)
- Different connection speeds and device types
- Animation state transitions
