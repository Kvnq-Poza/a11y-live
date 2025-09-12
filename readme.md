# A11y Live - Real-time Accessibility Testing Tool

A comprehensive, real-time accessibility testing tool that monitors DOM changes and provides instant feedback on WCAG compliance violations. Built with JavaScript, this tool helps developers identify and fix accessibility issues during development.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Accessibility Rules](#accessibility-rules)
- [UI Components](#ui-components)
- [Browser Support](#browser-support)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Functionality

- **Real-time Monitoring**: Uses MutationObserver to detect DOM changes and analyze new elements automatically
- **WCAG Compliance**: Implements comprehensive WCAG 2.1 AA/AAA accessibility rules
- **Performance Optimized**: Debounced analysis, caching, and efficient DOM traversal
- **Severity Classification**: Issues categorized as errors, warnings, or informational
- **Element Highlighting**: Visual overlay system to identify problematic elements
- **Detailed Reporting**: Comprehensive violation reports with fix suggestions

### User Interface

- **Interactive Panel**: Filterable, searchable results panel with detailed violation information
- **Visual Indicators**: Color-coded markers and highlights for different severity levels
- **Keyboard Accessible**: Full keyboard navigation and screen reader support
- **Step-by-step Tutorial**: Built-in help system for new users
- **Export Options**: Results can be exported in JSON, CSV, or HTML formats

### Developer Features

- **Extensible Rule System**: Easy to add custom accessibility rules
- **Multiple Integration Options**: Can be used as a standalone tool or integrated into existing workflows
- **Comprehensive Statistics**: Performance metrics and violation tracking
- **Focus Management**: Advanced focus trapping and restoration for modal interactions

## Installation

### Method 1: Direct Script Include

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Your Web Page</title>
  </head>
  <body>
    <!-- Your page content -->

    <!-- A11y Live Scripts -->
    <script src="./src/core/engine.js"></script>
    <!-- Other scripts will be loaded dynamically -->
  </body>
</html>
```

### Method 2: Module Import

```javascript
// If using ES modules
import A11yEngine from "./src/engine.js";

// Or CommonJS
const A11yEngine = require("./src/engine.js");
```

## Quick Start

### Basic Usage

```javascript
// Initialize the engine
const a11yLive = new A11yEngine({
  enableUI: true,
  realtime: true,
  mode: "development",
});

// Start monitoring
await a11yLive.start();

// The tool is now active and monitoring your page!
```

### Programmatic Analysis

```javascript
// Analyze specific elements
const results = await a11yLive.analyze(document.querySelector(".my-component"));

// Analyze multiple elements
const elements = document.querySelectorAll("form input");
const results = await a11yLive.analyze(elements);

// Get current statistics
const stats = a11yLive.getStats();
console.log(
  `Found ${stats.violationsFound} issues in ${stats.elementsProcessed} elements`
);
```

### Keyboard Shortcuts

- **Ctrl/Cmd + Shift + A**: Toggle the accessibility panel
- **Escape**: Close tutorial panel

## API Reference

### A11yEngine Class

#### Constructor

```javascript
new A11yEngine(options);
```

**Options:**

- `mode` (string): 'development' or 'production' - Default: 'development'
- `realtime` (boolean): Enable real-time monitoring - Default: true
- `rules` (Array): Custom rules to include - Default: []
- `target` (Element): Root element to monitor - Default: document.body
- `debounceMs` (number): Debounce delay for mutations - Default: 300
- `maxElements` (number): Maximum elements per analysis batch - Default: 500
- `enableUI` (boolean): Enable visual UI components - Default: true

#### Methods

##### `start(overrideOptions)`

Starts the accessibility monitoring engine.

```javascript
await a11yLive.start({
  target: document.querySelector("#app"),
  realtime: false,
});
```

##### `stop()`

Stops monitoring and cleans up resources.

```javascript
a11yLive.stop();
```

##### `analyze(elements)`

Analyzes specific elements for accessibility violations.

```javascript
// Single element
const results = await a11yLive.analyze(document.getElementById("myButton"));

// Multiple elements
const results = await a11yLive.analyze(document.querySelectorAll("img"));

// Returns array of AnalysisResult objects
```

##### `getStats()`

Returns performance and usage statistics.

```javascript
const stats = a11yLive.getStats();
// Returns: { analysisCount, totalAnalysisTime, violationsFound, elementsProcessed, averageAnalysisTime, cacheSize, isRunning }
```

#### Events

The engine emits custom events that you can listen for:

```javascript
// Engine started
window.addEventListener("a11y-live-started", (event) => {
  console.log("A11y Live started", event.detail);
});

// Engine stopped
window.addEventListener("a11y-live-stopped", (event) => {
  console.log("A11y Live stopped", event.detail);
});
```

### AnalysisResult Object

Each violation found returns an AnalysisResult object with these properties:

```javascript
{
    ruleId: "missing-alt-text",
    name: "Images Missing Alternative Text",
    description: "All images must have alternative text for screen readers",
    wcag: "1.1.1",
    severity: "error", // "error" | "warning" | "info"
    category: "multimedia",
    element: HTMLElement, // Reference to the problematic element
    selector: "#myImage", // CSS selector for the element
    message: "Image is missing alternative text",
    suggestion: "Add descriptive alt attribute",
    examples: { good: "...", bad: "..." },
    resources: ["https://..."],
    impact: 7.5, // Impact score (0-10)
    timestamp: 1635789123456,
    // Additional properties added by Reporter
    context: { location: "main content", purpose: "decorative image" },
    fixSuggestions: [{ type: "attribute", action: "Add alt", code: "..." }],
    userImpact: "Screen reader users will not understand...",
    learnMore: { explanation: "...", resources: [...] }
}
```

## Configuration

### Custom Rules

You can add custom accessibility rules:

```javascript
const customRule = {
  id: "custom-button-rule",
  name: "Custom Button Validation",
  description: "Buttons must meet our custom requirements",
  wcag: "2.1.1",
  severity: "warning",
  category: "custom",
  selector: "button",
  test: (element) => {
    // Return true if passes, false if violation
    return element.textContent.trim().length > 0;
  },
  message: "Button needs text content",
  suggestion: "Add descriptive text to the button",
};

// Add to engine
const engine = new A11yEngine();
engine._ruleEngine.rules.set(customRule.id, customRule);
engine._ruleEngine.enabledRules.add(customRule.id);
```

### Disabling Specific Rules

```javascript
// Get current enabled rules
const enabledRules = engine._ruleEngine.getEnabledRules().map((r) => r.id);

// Remove a rule
const filteredRules = enabledRules.filter((id) => id !== "missing-alt-text");

// Update enabled rules
engine._ruleEngine.updateEnabledRules(filteredRules);
```

## Accessibility Rules

The tool includes comprehensive WCAG 2.1 rules organized by category:

### Multimedia Rules

- **missing-alt-text**: Images must have alternative text
- **table-missing-headers**: Data tables must have proper headers

### Form Rules

- **missing-form-labels**: Form inputs must have accessible labels
- **empty-buttons**: Buttons must have accessible text

### Color & Contrast Rules

- **insufficient-color-contrast**: Text must meet 4.5:1 contrast ratio

### Structural Rules

- **missing-heading-structure**: Headings must follow logical hierarchy
- **missing-lang-attribute**: HTML must specify language

### Keyboard Navigation Rules

- **missing-focus-indicators**: Interactive elements need focus indicators

### Semantic Rules

- **empty-links**: Links must have descriptive text
- **invalid-aria-attributes**: ARIA attributes must be valid

### ARIA Rules

- **invalid-aria-attributes**: Validates ARIA usage and values

## UI Components

### Panel Component

The main interface showing violation list and details:

- Filterable by severity (All/Errors/Warnings)
- Searchable by violation name or description
- Click violations to see detailed information
- Copy code suggestions to clipboard

### Overlay Component

Visual highlighting system:

- Highlights problematic elements with colored borders
- Shows tooltips with violation names
- Small circular markers for persistent indication
- Click markers to select violations in panel

### Tutorial Component

Interactive help system:

- Step-by-step introduction to tool features
- Keyboard accessible navigation
- Modal overlay with focus management

## Browser Support

### Minimum Requirements

- **Chrome**: 51+
- **Firefox**: 55+
- **Safari**: 10+
- **Edge**: 79+

### Required APIs

- MutationObserver
- IntersectionObserver
- getComputedStyle
- querySelector/querySelectorAll
- ES6 Classes and Promises

### Accessibility Standards

- WCAG 2.1 AA compliance for the tool itself
- Screen reader tested (NVDA, JAWS, VoiceOver)
- Full keyboard navigation support
- High contrast mode compatible

## Performance Considerations

### Optimization Features

- **Debounced Analysis**: Groups rapid DOM changes to reduce processing
- **Element Caching**: Avoids re-analyzing unchanged elements
- **Batch Processing**: Limits analysis batch size to prevent UI blocking
- **Efficient Selectors**: Uses optimized CSS selectors for rule targeting
- **requestAnimationFrame**: Schedules analysis during browser idle time

### Memory Management

- Automatic cleanup of DOM references
- Map-based caching with automatic size limits
- Event listener cleanup on stop()
- Proper disposal of UI components

### Performance Statistics

Monitor tool performance with built-in metrics:

```javascript
const stats = engine.getStats();
console.log(`Average analysis time: ${stats.averageAnalysisTime}ms`);
console.log(`Cache efficiency: ${stats.cacheSize} cached elements`);
```

## Troubleshooting

### Common Issues

**Tool doesn't start:**

```javascript
// Check browser support
if (!window.MutationObserver) {
  console.error("Browser does not support required APIs");
}

// Verify all scripts are loaded
if (typeof RuleEngine === "undefined") {
  console.error("Rule engine not loaded - check script paths");
}
```

**Performance issues:**

```javascript
// Reduce analysis frequency
const engine = new A11yEngine({
  debounceMs: 1000, // Increase debounce
  maxElements: 100, // Reduce batch size
});
```

**UI not appearing:**

```javascript
// Check if UI is enabled
const engine = new A11yEngine({
  enableUI: true, // Ensure UI is enabled
});

// Check for CSS conflicts
console.log(document.querySelector("#a11y-live-panel"));
```

## Integration Examples

### React Integration

```javascript
import { useEffect } from "react";

function App() {
  useEffect(() => {
    const engine = new A11yEngine({
      target: document.getElementById("root"),
      realtime: true,
    });

    engine.start();

    return () => engine.stop();
  }, []);

  return <div id="root">{/* Your app */}</div>;
}
```

### Vue Integration

```javascript
export default {
  mounted() {
    this.a11yEngine = new A11yEngine({
      target: this.$el,
      realtime: true,
    });
    this.a11yEngine.start();
  },

  beforeDestroy() {
    if (this.a11yEngine) {
      this.a11yEngine.stop();
    }
  },
};
```

### Testing Integration

```javascript
// Jest test example
describe("Accessibility", () => {
  it("should have no accessibility violations", async () => {
    const engine = new A11yEngine({ enableUI: false });
    await engine.start();

    const results = await engine.analyze(document.body);

    expect(results).toHaveLength(0);

    engine.stop();
  });
});
```

## Export and Reporting

### Export Formats

```javascript
// Get reporter instance
const reporter = engine._reporter;

// Export as JSON
const jsonReport = reporter.exportResults("json");

// Export as CSV
const csvReport = reporter.exportResults("csv");

// Export as HTML report
const htmlReport = reporter.exportResults("html");

// Save to file (browser)
const blob = new Blob([htmlReport], { type: "text/html" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "accessibility-report.html";
a.click();
```

### Custom Reporting

```javascript
// Get processed results
const summary = reporter.getSummary();
const results = reporter.getFilteredResults({
  severity: ["error"],
  category: ["forms"],
});

// Create custom report
const customReport = {
  timestamp: new Date().toISOString(),
  url: window.location.href,
  summary: summary,
  criticalIssues: results.filter((r) => r.severity === "error"),
  recommendations: results.map((r) => r.fixSuggestions).flat(),
};
```

## Contributing

This tool is designed to be extensible. Areas for contribution:

1. **New Accessibility Rules**: Add rules for emerging WCAG guidelines
2. **UI Enhancements**: Improve the user interface and user experience
3. **Performance Optimizations**: Optimize analysis algorithms
4. **Browser Compatibility**: Extend support for older browsers
5. **Integration Examples**: Add examples for popular frameworks

### Development Setup

```bash
# Clone repository
git clone [repository-url]

# Install dependencies (if using package manager)
npm install

# Start development server
npm start

# Run tests
npm test
```

---

**A11y Live** helps create more inclusive web experiences by making accessibility testing an integral part of the development process. By providing real-time feedback and actionable insights, it empowers developers to build accessible applications from the ground up.
