---
applyTo: "**/*.ts"
---
# TypeScript Instructions for Extended Clipboard Desktop App

## Type Safety Guidelines

- Use strict TypeScript configuration - avoid `any` type unless absolutely necessary
- Prefer `unknown` over `any` when the type is truly unknown
- Use type assertions sparingly and prefer type guards for runtime type checking
- Define explicit return types for functions, especially public APIs
- Use const assertions (`as const`) for literal types and readonly arrays

## Interface and Type Definitions

- Use descriptive interface names with meaningful suffixes (Model, Config, Service, etc.)
- Define interfaces for all API response structures
- Use union types for controlled string literals instead of enums when appropriate
- Prefer composition over inheritance for type definitions
- Group related types in dedicated files (e.g., `clip.ts` for all clip-related types)

## Error Handling

- Create custom error types for different error scenarios
- Use discriminated unions for error handling patterns
- Implement proper error boundaries with typed error objects
- Always handle Promise rejections with appropriate error types
- Use Result/Either patterns for operations that can fail

## Function and Method Patterns

- Use arrow functions for inline callbacks and functional programming
- Prefer function declarations for top-level functions that need hoisting
- Implement proper typing for event handlers and callbacks
- Use generic types for reusable utility functions
- Document complex type transformations with comments

## Async/Await Best Practices

- Always handle async operations with proper error catching
- Use proper typing for Promise return values
- Avoid mixing Promise and async/await patterns in the same function
- Implement timeout handling for long-running async operations
- Use Promise.allSettled() for concurrent operations when some failures are acceptable

## Module Organization

- Use barrel exports (index.ts) to create clean public APIs
- Organize exports logically with re-exports where appropriate
- Avoid circular dependencies between modules
- Use path mapping in tsconfig.json for cleaner imports
- Keep internal implementation details private within modules

## Utility and Helper Functions

- Create strongly typed utility functions for common operations
- Use type guards for runtime type validation
- Implement proper generic constraints for utility functions
- Prefer immutable operations over mutating existing objects
- Use the `Readonly` utility type for immutable data structures

## Integration with External Libraries

- Always install @types packages for external libraries when available
- Create custom type declarations for untyped libraries
- Wrap external API calls with proper TypeScript interfaces
- Use module augmentation to extend third-party types when necessary
- Implement adapter patterns for external services with strong typing

## Performance Considerations

- Use `readonly` arrays and objects for data that shouldn't change
- Implement proper tree-shaking with ES modules
- Avoid heavy computations in type-level operations
- Use lazy loading for large type definitions when appropriate
- Consider using `satisfies` operator for better type inference

## Documentation and Comments

- Use JSDoc comments for public APIs and complex type definitions
- Document type parameters and their constraints
- Explain non-obvious type transformations and mappings
- Include examples in JSDoc for complex utility types
- Keep comments up-to-date with code changes
