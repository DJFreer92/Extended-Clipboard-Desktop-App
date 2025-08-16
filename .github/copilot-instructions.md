# Extended Clipboard Desktop App - Copilot Instructions

## Project Overview

This is a modern Electron + React desktop application that provides intelligent clipboard management. The app automatically monitors the system clipboard, saves clips to a backend API, and offers powerful tools to browse, search, filter, and organize clipboard history.

## Architecture

- **Frontend**: React 19 + Vite for the renderer process
- **Desktop Framework**: Electron for native desktop functionality
- **Backend Communication**: RESTful API integration with the Extended Clipboard API
- **Build System**: TypeScript compilation with Vite bundling
- **Testing**: Vitest for unit testing with React Testing Library

## Core Concepts

- **Clips**: Text content items saved from the clipboard with metadata (timestamp, source app, tags, favorites)
- **Background Monitoring**: Continuous clipboard polling (1.5s intervals) that runs independently of UI focus
- **Smart Filtering**: Multi-dimensional filtering by app, date range, tags, and favorites
- **Infinite Scrolling**: Efficient pagination for large clip collections
- **Duplicate Prevention**: Intelligent handling to avoid saving identical consecutive clips

## Project Structure

- `src/main/` - Electron main process (Node.js environment)
- `src/renderer/` - React UI (browser environment)
- `src/models/` - Shared TypeScript interfaces and data models
- `src/services/` - API communication layer organized by domain
- `src/assets/` - Static resources (icons, images)

## Code Organization Principles

1. **Feature-based Organization**: Group related components, hooks, and utilities by feature
2. **Service Layer Pattern**: Isolate API communication in dedicated service modules
3. **Model Abstraction**: Use consistent TypeScript interfaces for data structures
4. **Separation of Concerns**: Clear boundaries between main process, renderer, and shared code
5. **Test Co-location**: Keep tests close to the code they test

## Naming Conventions

- **Files**: camelCase for regular files, PascalCase for React components
- **Variables/Functions**: camelCase
- **Types/Interfaces**: PascalCase with descriptive suffixes (Model, Service, Config)
- **Constants**: SCREAMING_SNAKE_CASE
- **CSS Classes**: kebab-case with BEM methodology where appropriate

## Best Practices

### Code Quality
- Use strict TypeScript configuration with proper typing
- Implement comprehensive error handling with user-friendly messages
- Follow React 19 best practices and modern patterns
- Maintain consistent code formatting and linting standards

### Performance
- Implement efficient state management to minimize re-renders
- Use proper dependency arrays in React hooks
- Optimize API calls with appropriate caching and debouncing
- Consider memory usage in long-running background processes

### Security
- Sanitize user input and API responses
- Use secure communication protocols
- Implement proper error boundaries to prevent crashes
- Follow Electron security best practices for IPC

### Accessibility
- Implement proper ARIA labels and semantic HTML
- Ensure keyboard navigation works throughout the app
- Provide clear visual feedback for user actions
- Use appropriate color contrast and text sizing

### Testing
- Write comprehensive unit tests for business logic
- Test React components with user-centric scenarios
- Mock external dependencies and API calls appropriately
- Maintain good test coverage without compromising quality

## Development Workflow

- Use feature branches for development
- Write descriptive commit messages
- Ensure tests pass before committing
- Consider backward compatibility when modifying APIs
- Document significant architectural decisions

## User Experience Focus

- Prioritize smooth, responsive interactions
- Provide clear visual feedback for all user actions
- Implement graceful error handling with recovery options
- Design for both mouse and keyboard users
- Maintain consistency across all UI elements
