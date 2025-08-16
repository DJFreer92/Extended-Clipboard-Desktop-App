---
applyTo: "**/*.tsx"
---
# React TypeScript (TSX) Instructions for Extended Clipboard Desktop App

## Component Definition Patterns

- Use function components with TypeScript interfaces for props
- Define prop interfaces with descriptive names ending in "Props"
- Use React.FC type annotation only when you need access to children or other FC properties
- Prefer explicit prop destructuring in function parameters
- Define default props using ES6 default parameters

```tsx
interface ClipListProps {
  clips: ClipModel[];
  onClipClick: (clip: ClipModel) => void;
  loading?: boolean;
}

function ClipList({ clips, onClipClick, loading = false }: ClipListProps) {
  // Component implementation
}
```

## Hooks and State Management

- Use proper TypeScript generics with useState for complex state
- Define custom hook return types explicitly
- Use useCallback and useMemo with proper dependency typing
- Implement proper typing for useRef with DOM elements
- Create strongly typed custom hooks with clear interfaces

```tsx
const [clips, setClips] = useState<ClipModel[]>([]);
const inputRef = useRef<HTMLInputElement>(null);
```

## Event Handling

- Use proper React event types (React.MouseEvent, React.ChangeEvent, etc.)
- Define event handler types explicitly for reusable handlers
- Implement proper event delegation patterns with TypeScript
- Use type assertions carefully for event targets
- Create typed callback functions for parent-child communication

```tsx
const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setSearchTerm(event.target.value);
};

const handleClipClick = useCallback((clip: ClipModel) => {
  onClipSelect(clip);
}, [onClipSelect]);
```

## Props and Children Patterns

- Use React.ReactNode for children props
- Implement render props with proper generic typing
- Use conditional rendering with type-safe patterns
- Define union types for props that accept multiple value types
- Implement proper component composition patterns

## Form Handling

- Use controlled components with proper typing
- Implement form validation with TypeScript schemas
- Define form data interfaces for complex forms
- Use proper typing for form submission handlers
- Implement error handling with typed error states

## Styling and CSS Integration

- Use CSS Modules with TypeScript for type-safe styling
- Implement proper className composition patterns
- Use styled-components or similar libraries with TypeScript
- Define theme interfaces for consistent styling
- Implement responsive design patterns with TypeScript

## Performance Optimization

- Use React.memo with proper prop comparison functions
- Implement useMemo and useCallback with proper dependencies
- Use lazy loading for components with React.lazy and Suspense
- Implement proper key props for list rendering
- Avoid inline object creation in render methods

```tsx
const MemoizedClipItem = React.memo(ClipItem, (prevProps, nextProps) => {
  return prevProps.clip.Id === nextProps.clip.Id;
});
```

## Error Boundaries and Error Handling

- Implement error boundaries with proper TypeScript typing
- Use React error boundary patterns for graceful error handling
- Create typed error states for component-level error handling
- Implement proper fallback UI patterns
- Log errors with proper context information

## Testing Integration

- Write components with testability in mind
- Use data-testid attributes for reliable test selectors
- Implement proper prop mocking for testing
- Create test utilities for common component testing patterns
- Use proper TypeScript types in test files

## Accessibility (a11y)

- Use proper ARIA attributes with TypeScript
- Implement keyboard navigation with proper event typing
- Use semantic HTML elements with proper TypeScript interfaces
- Implement proper focus management patterns
- Create accessible component patterns with TypeScript

## Component Organization

- Keep components focused on single responsibilities
- Use proper folder structure for component organization
- Implement proper import/export patterns
- Create reusable component libraries with TypeScript
- Document component APIs with proper TypeScript interfaces

## React 19 Specific Patterns

- Use the new JSX transform properly
- Implement Suspense boundaries with proper typing
- Use concurrent features with appropriate TypeScript patterns
- Implement proper error handling for concurrent rendering
- Use new React 19 hooks with proper TypeScript integration

## State Management Integration

- Implement proper typing for context providers
- Use reducer patterns with proper action typing
- Create typed selectors for state access
- Implement proper state normalization patterns
- Use immutable update patterns with TypeScript
