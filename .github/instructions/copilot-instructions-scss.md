---
applyTo: "**/*.scss"
---
# SCSS/Sass Instructions for Extended Clipboard Desktop App

## Architecture and Organization

- Use SCSS syntax (.scss files) for better readability and compatibility
- Organize styles using the 7-1 architecture pattern when applicable
- Create separate files for variables, mixins, base styles, and components
- Use partial files (prefixed with underscore) for modular imports
- Maintain a consistent import order in main stylesheet

## Variables and Configuration

- Define color palettes, typography scales, and spacing systems as variables
- Use semantic naming for colors (primary, secondary, error, success)
- Create consistent spacing and sizing scales
- Define breakpoints for responsive design
- Use CSS custom properties for values that change at runtime

```scss
// Color palette
$color-primary: #007acc;
$color-secondary: #6c757d;
$color-error: #dc3545;
$color-success: #28a745;

// Spacing system
$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;
$spacing-xl: 2rem;

// Typography
$font-family-primary: 'Segoe UI', system-ui, sans-serif;
$font-size-sm: 0.875rem;
$font-size-base: 1rem;
$font-size-lg: 1.125rem;
```

## Mixins and Functions

- Create reusable mixins for common patterns (flex layouts, animations, etc.)
- Use functions for calculations and transformations
- Implement responsive breakpoint mixins
- Create utility mixins for accessibility features
- Use parameterized mixins for flexible component styling

```scss
// Responsive breakpoint mixin
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'small' {
    @media (max-width: 767px) { @content; }
  }
  @if $breakpoint == 'medium' {
    @media (min-width: 768px) and (max-width: 1023px) { @content; }
  }
  @if $breakpoint == 'large' {
    @media (min-width: 1024px) { @content; }
  }
}

// Flexbox utilities
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

## BEM Methodology

- Use Block Element Modifier (BEM) naming convention for clarity
- Keep blocks independent and reusable
- Use modifiers for variations and states
- Avoid deep nesting beyond 3 levels
- Create component-scoped style blocks

```scss
// Block
.clip-item {
  padding: $spacing-md;
  border: 1px solid $color-gray-300;
  border-radius: 4px;

  // Element
  &__content {
    font-size: $font-size-base;
    line-height: 1.5;
  }

  &__timestamp {
    font-size: $font-size-sm;
    color: $color-gray-600;
  }

  // Modifier
  &--favorite {
    border-color: $color-primary;
    background-color: rgba($color-primary, 0.1);
  }

  &--selected {
    background-color: $color-primary;
    color: white;
  }
}
```

## Responsive Design

- Use mobile-first approach with min-width media queries
- Create flexible layouts using CSS Grid and Flexbox
- Implement fluid typography with clamp() function
- Use relative units (rem, em, %) for scalable designs
- Test across different screen sizes and orientations

```scss
.clip-grid {
  display: grid;
  gap: $spacing-md;

  // Mobile-first: single column
  grid-template-columns: 1fr;

  // Tablet and up: multiple columns
  @include respond-to('medium') {
    grid-template-columns: repeat(2, 1fr);
  }

  @include respond-to('large') {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Component Styling

- Scope styles to component level to avoid conflicts
- Use logical properties (margin-inline, padding-block) for internationalization
- Implement consistent spacing and alignment
- Create reusable component variants with modifiers
- Follow component-driven development principles

## Performance Optimization

- Minimize nesting depth to reduce CSS specificity issues
- Use efficient selectors and avoid universal selectors
- Optimize for CSS bundle size by removing unused styles
- Use autoprefixer for vendor prefix management
- Implement critical CSS loading for above-the-fold content

## Accessibility and Inclusive Design

- Ensure sufficient color contrast ratios (WCAG AA compliance)
- Implement focus styles for keyboard navigation
- Use semantic color naming and avoid color-only indicators
- Support prefers-reduced-motion for animations
- Test with screen readers and assistive technologies

```scss
// Focus styles
.button {
  &:focus-visible {
    outline: 2px solid $color-primary;
    outline-offset: 2px;
  }
}

// Respect user preferences
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Dark Mode Support

- Use CSS custom properties for theme-aware colors
- Implement prefers-color-scheme media queries
- Create consistent dark mode color palettes
- Test contrast ratios in both light and dark themes
- Provide manual theme switching capabilities

```scss
:root {
  --color-background: #{$color-white};
  --color-text: #{$color-gray-900};
  --color-surface: #{$color-gray-100};
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #{$color-gray-900};
    --color-text: #{$color-white};
    --color-surface: #{$color-gray-800};
  }
}
```

## Animation and Transitions

- Use meaningful animations that enhance user experience
- Implement consistent timing functions and durations
- Create smooth transitions for state changes
- Use transform and opacity for performant animations
- Provide animation controls for user preferences

```scss
.clip-item {
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
```

## Maintenance and Documentation

- Comment complex calculations and browser-specific hacks
- Use consistent formatting and indentation
- Group related properties logically within rules
- Document color choices and design system decisions
- Keep stylesheets organized and refactor regularly

## Integration with React Components

- Use CSS Modules or styled-components for component-scoped styles
- Implement proper class name composition patterns
- Handle dynamic styling with CSS custom properties
- Create utility classes for common styling patterns
- Maintain separation between layout and component styles
