---
applyTo: "**/*.html"
---
# HTML Instructions for Extended Clipboard Desktop App

## Semantic HTML Structure

- Use semantic HTML5 elements (header, nav, main, section, article, aside, footer)
- Choose elements based on meaning, not appearance
- Use headings (h1-h6) to create proper document outline
- Implement landmarks for screen reader navigation
- Use lists (ul, ol, dl) for grouped content

```html
<main class="app-content">
  <header class="app-header">
    <h1>Extended Clipboard</h1>
    <nav aria-label="Main navigation">
      <button aria-label="Settings">Settings</button>
    </nav>
  </header>

  <section aria-label="Clipboard history">
    <h2>Recent Clips</h2>
    <ul class="clip-list">
      <!-- Clip items -->
    </ul>
  </section>
</main>
```

## Accessibility (a11y) Best Practices

- Provide meaningful alt text for images and icons
- Use ARIA labels, roles, and properties appropriately
- Ensure proper heading hierarchy and structure
- Implement keyboard navigation support
- Use sufficient color contrast and focus indicators

```html
<!-- Descriptive labels and ARIA attributes -->
<button
  aria-label="Copy clip to clipboard"
  aria-describedby="clip-content-1"
  class="clip-copy-btn"
>
  <span class="icon icon-copy" aria-hidden="true"></span>
</button>

<div id="clip-content-1" class="clip-content">
  Sample clipboard content
</div>

<!-- Skip navigation for keyboard users -->
<a href="#main-content" class="skip-link">Skip to main content</a>
```

## Form Elements and Input Handling

- Use appropriate input types (text, search, email, tel, etc.)
- Associate labels with form controls using for/id attributes
- Provide helpful placeholder text and validation messages
- Group related form controls with fieldset and legend
- Implement proper form validation and error handling

```html
<form class="search-form" role="search">
  <div class="form-group">
    <label for="clip-search" class="form-label">
      Search clips
    </label>
    <input
      type="search"
      id="clip-search"
      class="form-input"
      placeholder="Search your clipboard history..."
      aria-describedby="search-help"
      autocomplete="off"
    />
    <div id="search-help" class="form-help">
      Search by content, app name, or tags
    </div>
  </div>
</form>
```

## Interactive Elements

- Use button elements for actions, anchor elements for navigation
- Provide clear, descriptive text for interactive elements
- Implement proper focus management and tab order
- Use appropriate ARIA states (expanded, selected, checked)
- Ensure interactive elements are large enough for touch interaction

```html
<!-- Expandable content with proper ARIA states -->
<button
  aria-expanded="false"
  aria-controls="clip-details-1"
  class="clip-toggle"
>
  Show clip details
</button>

<div id="clip-details-1" class="clip-details" hidden>
  <dl class="clip-metadata">
    <dt>Source Application:</dt>
    <dd>Visual Studio Code</dd>
    <dt>Timestamp:</dt>
    <dd>2025-08-16 10:30 AM</dd>
  </dl>
</div>
```

## Data Attributes and Metadata

- Use data attributes for JavaScript interaction targets
- Implement microdata or structured data where appropriate
- Use meta tags for application metadata
- Store component state in data attributes when needed
- Use data attributes for testing selectors

```html
<!-- Data attributes for JavaScript interaction -->
<div
  class="clip-item"
  data-clip-id="123"
  data-testid="clip-item"
  data-app-name="Visual Studio Code"
>
  <div class="clip-content">Sample content</div>
  <button
    class="clip-action"
    data-action="copy"
    data-clip-id="123"
  >
    Copy
  </button>
</div>
```

## Performance and Loading

- Use appropriate loading strategies (lazy, eager) for images
- Implement proper resource hints (preload, prefetch, dns-prefetch)
- Use semantic markup to improve rendering performance
- Minimize DOM depth and complexity
- Implement proper progressive enhancement

```html
<!-- Resource hints and loading optimization -->
<link rel="preload" href="/assets/icons/sprite.svg" as="image">
<link rel="dns-prefetch" href="//api.extendedclipboard.com">

<!-- Lazy loading for non-critical images -->
<img
  src="/assets/app-icon.png"
  alt="Extended Clipboard Logo"
  loading="lazy"
  width="64"
  height="64"
/>
```

## Error Handling and Fallbacks

- Provide fallback content for failed resources
- Implement proper error boundaries in HTML structure
- Use noscript tags for non-JavaScript fallbacks
- Provide alternative content for assistive technologies
- Handle empty states and loading states gracefully

```html
<!-- Fallback content and error handling -->
<div class="clip-list" data-testid="clip-list">
  <div class="loading-state" aria-live="polite">
    Loading your clips...
  </div>

  <div class="empty-state" hidden>
    <h3>No clips found</h3>
    <p>Your clipboard history will appear here when you copy text.</p>
  </div>

  <div class="error-state" hidden>
    <h3>Unable to load clips</h3>
    <p>Please check your connection and try again.</p>
    <button class="retry-btn">Retry</button>
  </div>
</div>
```

## Document Structure and Meta Information

- Use proper DOCTYPE and language declarations
- Include essential meta tags for viewport and character encoding
- Implement proper title hierarchy for page/view identification
- Use meta descriptions for application information
- Include necessary security-related meta tags

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Extended Clipboard - Intelligent clipboard management">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
  <title>Extended Clipboard</title>
</head>
```

## Component Integration Patterns

- Structure HTML to support React component boundaries
- Use container elements for component mounting points
- Implement proper component wrapper patterns
- Structure for CSS styling and responsive design
- Create reusable HTML patterns for common components

```html
<!-- Component container structure -->
<div class="app-shell">
  <div id="header-root" class="header-container"></div>
  <div id="main-root" class="main-container">
    <!-- React components will mount here -->
  </div>
  <div id="footer-root" class="footer-container"></div>
</div>
```

## Internationalization (i18n) Support

- Use proper lang attributes for different language content
- Implement dir attribute for right-to-left languages
- Structure content to support text expansion/contraction
- Use logical properties in CSS for directional layouts
- Plan for dynamic content translation

```html
<!-- Language and direction support -->
<html lang="en" dir="ltr">
<body>
  <div class="content" lang="en">
    <p>Default English content</p>
  </div>

  <div class="content" lang="es" hidden>
    <p>Contenido en español</p>
  </div>
</body>
</html>
```

## Security Considerations

- Sanitize any user-generated content
- Use proper Content Security Policy meta tags
- Avoid inline scripts and styles when possible
- Implement proper CORS handling for external resources
- Validate and escape data before rendering in HTML

## Testing and Development

- Use semantic selectors for test automation
- Implement proper data-testid attributes for reliable testing
- Structure HTML for easy component testing
- Create valid, well-formed markup for consistent parsing
- Use HTML validation tools to ensure standards compliance

## Progressive Enhancement

- Start with functional HTML before adding JavaScript
- Ensure core functionality works without JavaScript
- Use proper fallback content for enhanced features
- Implement graceful degradation for older browsers
- Design HTML structure to support multiple interaction methods
