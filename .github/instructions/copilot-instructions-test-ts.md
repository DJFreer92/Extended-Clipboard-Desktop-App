---
applyTo: "**/*.{test,spec}.ts"
---
# TypeScript Test Instructions for Extended Clipboard Desktop App

## Test Structure and Organization

- Use Vitest as the primary testing framework
- Group related tests using `describe` blocks with clear, descriptive names
- Use `it` or `test` for individual test cases with specific, action-oriented descriptions
- Follow AAA pattern: Arrange, Act, Assert
- Keep test files co-located with the code they test (e.g., `clipsService.test.ts` next to `clipsService.ts`)

```ts
describe('clipsService', () => {
  it('should return formatted clips when API call succeeds', async () => {
    // Arrange
    const mockApiResponse = [{ id: 1, content: 'test' }];

    // Act
    const result = await clipsService.getRecentClips(10);

    // Assert
    expect(result).toEqual(expectedFormattedClips);
  });
});
```

## Mocking and Test Doubles

- Use vi.fn() for creating mock functions with proper TypeScript typing
- Mock external dependencies using vi.mock() with type-safe implementations
- Create factory functions for generating test data with proper types
- Use partial mocks when only specific methods need to be mocked
- Reset mocks between tests using beforeEach/afterEach hooks

```ts
const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();
vi.stubGlobal('fetch', mockFetch);

const createMockClip = (overrides: Partial<ClipModel> = {}): ClipModel => ({
  Id: 1,
  Content: 'Test content',
  Timestamp: Date.now(),
  FromAppName: 'TestApp',
  Tags: [],
  IsFavorite: false,
  ...overrides,
});
```

## Type Safety in Tests

- Define proper types for test data and mock objects
- Use type assertions carefully and prefer type guards
- Create typed test utilities and helper functions
- Implement proper typing for async test scenarios
- Use generic types for reusable test patterns

## Error Testing

- Test both success and failure scenarios for all functions
- Use proper error type assertions for error handling tests
- Test error boundaries and error recovery mechanisms
- Implement proper async error testing with async/await
- Test edge cases and boundary conditions

```ts
it('should handle API errors gracefully', async () => {
  mockFetch.mockRejectedValueOnce(new Error('Network error'));

  await expect(clipsService.getRecentClips(10)).rejects.toThrow('Network error');
});
```

## Service Layer Testing

- Mock HTTP calls using vi.stubGlobal for fetch
- Test API request formatting and response parsing
- Verify correct endpoint URLs and HTTP methods
- Test request headers and authentication
- Validate error handling for network failures

## Utility Function Testing

- Test pure functions with various input combinations
- Use property-based testing for complex utility functions
- Test edge cases, null/undefined inputs, and boundary values
- Verify immutability for functions that should not mutate inputs
- Test performance characteristics for critical utility functions

## Mock Data and Fixtures

- Create realistic mock data that reflects actual API responses
- Use factory functions to generate test data with random values
- Maintain consistent mock data structure across tests
- Create fixture files for complex test data
- Use proper TypeScript interfaces for all mock data

## Test Performance and Cleanup

- Use beforeEach and afterEach for proper test isolation
- Clear mocks and reset state between tests
- Avoid test interdependencies and shared mutable state
- Use vi.clearAllMocks() or vi.restoreAllMocks() appropriately
- Monitor test execution time and optimize slow tests

## Integration Testing Patterns

- Test service integration with proper API mocking
- Use MSW (Mock Service Worker) for complex API mocking scenarios
- Test error propagation through service layers
- Verify data transformation between API and UI models
- Test concurrent API calls and race conditions

## Assertion Best Practices

- Use specific matchers (toEqual, toStrictEqual, toMatchObject)
- Create custom matchers for domain-specific assertions
- Use proper async assertion patterns with resolves/rejects
- Implement snapshot testing sparingly and maintain snapshots
- Use expect.arrayContaining and expect.objectContaining for partial matches

## Test Coverage and Quality

- Aim for high test coverage but prioritize critical paths
- Test business logic thoroughly, utility functions completely
- Focus on testing behavior rather than implementation details
- Use coverage reports to identify untested code paths
- Write tests that fail when the code is broken

## Documentation and Maintainability

- Write descriptive test names that explain the expected behavior
- Use comments to explain complex test setup or assertions
- Group related tests logically within describe blocks
- Keep tests simple and focused on single concerns
- Refactor tests when they become difficult to understand

## Testing Async Operations

- Always use async/await for testing async functions
- Test both resolved and rejected promise scenarios
- Use proper timeout handling for long-running operations
- Test concurrent operations and race conditions
- Implement proper cleanup for async resources
