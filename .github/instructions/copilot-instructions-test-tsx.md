---
applyTo: "**/*.{test,spec}.tsx"
---
# React TypeScript Test Instructions for Extended Clipboard Desktop App

## Component Testing Setup

- Use React Testing Library as the primary testing framework for components
- Import render, screen, and user events from @testing-library/react
- Use Vitest as the test runner with jsdom environment
- Test components from the user's perspective, not implementation details
- Focus on behavior and accessibility rather than internal state

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, describe, vi } from 'vitest';
import ClipList from './ClipList';
```

## Rendering and Querying

- Use semantic queries (getByRole, getByLabelText) over data-testid when possible
- Use getByText for content-based queries
- Use queryBy* variants when testing element absence
- Use findBy* variants for async operations
- Prefer screen queries over destructuring render result

```tsx
it('should display clip content', () => {
  render(<ClipList clips={mockClips} onClipClick={vi.fn()} />);

  expect(screen.getByText('Test clip content')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
});
```

## User Interaction Testing

- Use userEvent for realistic user interactions
- Test keyboard navigation and accessibility
- Verify event handler calls with proper arguments
- Test form interactions with proper typing
- Test complex user workflows end-to-end

```tsx
it('should call onClipClick when clip is clicked', async () => {
  const user = userEvent.setup();
  const mockOnClipClick = vi.fn();
  render(<ClipList clips={mockClips} onClipClick={mockOnClipClick} />);

  await user.click(screen.getByText('Test clip content'));

  expect(mockOnClipClick).toHaveBeenCalledWith(mockClips[0]);
});
```

## Mocking Props and Dependencies

- Create typed mock functions for prop callbacks
- Use realistic mock data that matches component prop interfaces
- Mock external dependencies and context providers
- Create wrapper components for testing components with context
- Use partial mocks for complex prop objects

```tsx
const mockClip: ClipModel = {
  Id: 1,
  Content: 'Test content',
  Timestamp: Date.now(),
  FromAppName: 'TestApp',
  Tags: ['test'],
  IsFavorite: false,
};

const mockProps: ClipListProps = {
  clips: [mockClip],
  onClipClick: vi.fn(),
  loading: false,
};
```

## Async Component Testing

- Use findBy* queries for elements that appear asynchronously
- Use waitFor for complex async state changes
- Test loading states and error states properly
- Mock async operations with realistic timing
- Test timeout scenarios and error recovery

```tsx
it('should show loading state while clips are being fetched', async () => {
  render(<ClipList clips={[]} loading={true} />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
```

## Testing Custom Hooks

- Create wrapper components for testing custom hooks
- Use renderHook from @testing-library/react for isolated hook testing
- Test hook state changes with act() when necessary
- Mock dependencies that hooks depend on
- Test error scenarios and edge cases

```tsx
function TestComponent() {
  const { clips, loading, error } = useClips();
  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {clips.map(clip => <div key={clip.Id}>{clip.Content}</div>)}
    </div>
  );
}
```

## Form Testing

- Test form submission with proper event handling
- Verify form validation and error messages
- Test controlled component state changes
- Use realistic user input patterns
- Test form reset and default values

```tsx
it('should update search term when input changes', async () => {
  const user = userEvent.setup();
  render(<SearchForm onSearch={vi.fn()} />);

  const searchInput = screen.getByRole('textbox', { name: /search/i });
  await user.type(searchInput, 'test query');

  expect(searchInput).toHaveValue('test query');
});
```

## Accessibility Testing

- Test keyboard navigation with tab and arrow keys
- Verify ARIA attributes and labels
- Test screen reader announcements
- Ensure proper focus management
- Test color contrast and visual accessibility

```tsx
it('should be accessible via keyboard navigation', async () => {
  const user = userEvent.setup();
  render(<ClipList clips={mockClips} onClipClick={vi.fn()} />);

  await user.tab();
  expect(screen.getByRole('button', { name: /copy/i })).toHaveFocus();

  await user.keyboard('{Enter}');
  // Verify action was triggered
});
```

## Error Boundary Testing

- Test error boundary fallback UI
- Simulate component errors for testing
- Verify error logging and reporting
- Test error recovery mechanisms
- Use error boundary wrapper in tests

```tsx
it('should display error boundary when component throws', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(<ErrorBoundary><ThrowError /></ErrorBoundary>);

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Testing Context and State Management

- Create custom render function with context providers
- Mock context values for different test scenarios
- Test context state changes and updates
- Verify context consumer behavior
- Test context error handling

```tsx
const renderWithContext = (ui: React.ReactElement, contextValue: any) => {
  return render(
    <TestContext.Provider value={contextValue}>
      {ui}
    </TestContext.Provider>
  );
};
```

## Performance Testing

- Test component re-rendering behavior
- Verify memo and callback optimizations
- Test large dataset rendering performance
- Monitor component mount/unmount cycles
- Use profiling tools for performance insights

## Snapshot Testing

- Use snapshots sparingly for stable UI components
- Keep snapshots small and focused
- Update snapshots carefully after reviewing changes
- Avoid snapshots for dynamic content
- Use custom serializers for meaningful snapshots

## Test Cleanup and Isolation

- Use cleanup function from testing library
- Reset mocks between tests
- Clear timers and intervals
- Unmount components properly
- Avoid test interdependencies

## Mock External Dependencies

- Mock Electron APIs and Node.js modules
- Mock browser APIs (clipboard, notifications)
- Create realistic mock implementations
- Test error scenarios from external dependencies
- Use dependency injection for easier testing
