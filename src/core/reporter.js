/**
 * A11y Live - Reporter
 *
 * Processes accessibility analysis results, prioritizes violations,
 * and formats them for display and export.
 */

class Reporter {
  constructor() {
    this.results = [];
    this.summary = {
      total: 0,
      errors: 0,
      warnings: 0,
      info: 0,
      categories: {},
      lastUpdate: null,
    };
  }

  /**
   * Process and prioritize analysis results
   * @param {Array<AnalysisResult>} rawResults - Raw analysis results
   * @returns {Array<ProcessedResult>} Processed and prioritized results
   */
  processResults(rawResults) {
    // Filter and deduplicate results
    const filteredResults = this._deduplicateResults(rawResults);

    // Sort by priority (impact score and severity)
    const prioritizedResults = this._prioritizeResults(filteredResults);

    // Enhance results with additional context
    const enhancedResults = prioritizedResults.map((result) =>
      this._enhanceResult(result)
    );

    // Update internal state
    this.results = enhancedResults;
    this._updateSummary();

    return enhancedResults;
  }

  /**
   * Remove duplicate violations for the same element and rule
   * @param {Array<AnalysisResult>} results - Raw results
   * @returns {Array<AnalysisResult>} Deduplicated results
   */
  _deduplicateResults(results) {
    const seen = new Set();
    return results.filter((result) => {
      const key = `${result.ruleId}-${this._getElementKey(result.element)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate unique key for element
   * @param {Element} element - DOM element
   * @returns {string} Unique element key
   */
  _getElementKey(element) {
    // Use multiple attributes to create unique key
    const id = element.id || "";
    const className = element.className || "";
    const tagName = element.tagName || "";
    const textContent = (element.textContent || "").substring(0, 50);

    return `${tagName}-${id}-${className}-${textContent}`.replace(/\s+/g, "-");
  }

  /**
   * Sort results by priority score
   * @param {Array<AnalysisResult>} results - Results to prioritize
   * @returns {Array<AnalysisResult>} Prioritized results
   */
  _prioritizeResults(results) {
    return results.sort((a, b) => {
      // Primary sort: severity (error > warning > info)
      const severityOrder = { error: 3, warning: 2, info: 1 };
      const severityDiff =
        severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;

      // Secondary sort: impact score
      const impactDiff = (b.impact || 0) - (a.impact || 0);
      if (impactDiff !== 0) return impactDiff;

      // Tertiary sort: WCAG level (A > AA > AAA)
      const wcagOrder =
        this._getWCAGPriority(a.wcag) - this._getWCAGPriority(b.wcag);
      if (wcagOrder !== 0) return wcagOrder;

      // Final sort: rule name alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get WCAG priority order
   * @param {string} wcag - WCAG guideline reference
   * @returns {number} Priority number (lower = higher priority)
   */
  _getWCAGPriority(wcag) {
    if (!wcag) return 999;

    // Extract level from WCAG reference (e.g., "1.1.1" -> 1)
    const parts = wcag.split(".");
    if (parts.length >= 1) {
      const level = parseInt(parts[0]);
      return level || 999;
    }
    return 999;
  }

  /**
   * Enhance result with additional context and suggestions
   * @param {AnalysisResult} result - Analysis result
   * @returns {ProcessedResult} Enhanced result
   */
  _enhanceResult(result) {
    const enhanced = { ...result };

    // Add contextual information
    enhanced.context = this._getElementContext(result.element);

    // Generate specific fix suggestions
    enhanced.fixSuggestions = this._generateFixSuggestions(result);

    // Add learning resources
    enhanced.learnMore = this._getEducationalContent(result);

    // Calculate user impact description
    enhanced.userImpact = this._describeUserImpact(result);

    // Add testing instructions
    enhanced.testingInstructions = this._getTestingInstructions(result);

    return enhanced;
  }

  /**
   * Get contextual information about element location and purpose
   * @param {Element} element - DOM element
   * @returns {Object} Context information
   */
  _getElementContext(element) {
    const context = {
      tagName: element.tagName.toLowerCase(),
      location: this._getElementLocation(element),
      purpose: this._inferElementPurpose(element),
      surroundingElements: this._getSurroundingElements(element),
      viewport: this._getViewportInfo(element),
    };

    return context;
  }

  /**
   * Describe element's location in the page
   * @param {Element} element - DOM element
   * @returns {string} Location description
   */
  _getElementLocation(element) {
    const landmarks = [];

    // Check for semantic landmarks
    let current = element;
    while (current && current !== document.body) {
      const role = current.getAttribute("role") || "";
      const tagName = current.tagName.toLowerCase();

      if (tagName === "main" || role === "main") {
        landmarks.unshift("main content");
      } else if (tagName === "header" || role === "banner") {
        landmarks.unshift("header");
      } else if (tagName === "footer" || role === "contentinfo") {
        landmarks.unshift("footer");
      } else if (tagName === "nav" || role === "navigation") {
        landmarks.unshift("navigation");
      } else if (tagName === "aside" || role === "complementary") {
        landmarks.unshift("sidebar");
      } else if (tagName === "form" || role === "form") {
        landmarks.unshift("form");
      }

      current = current.parentElement;
    }

    return landmarks.length > 0 ? landmarks.join(" → ") : "page content";
  }

  /**
   * Infer the purpose of an element
   * @param {Element} element - DOM element
   * @returns {string} Purpose description
   */
  _inferElementPurpose(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type || "";
    const role = element.getAttribute("role") || "";

    // Form elements
    if (tagName === "input") {
      const purposes = {
        email: "email input",
        password: "password input",
        search: "search input",
        tel: "phone number input",
        url: "URL input",
        checkbox: "checkbox",
        radio: "radio button",
        submit: "submit button",
        button: "button",
      };
      return purposes[type] || "text input";
    }

    // Other elements
    const purposes = {
      button: "interactive button",
      a: "link",
      img: "image",
      h1: "main heading",
      h2: "section heading",
      h3: "subsection heading",
      h4: "sub-subsection heading",
      h5: "minor heading",
      h6: "minor heading",
      select: "dropdown selection",
      textarea: "multi-line text input",
      table: "data table",
      form: "form container",
    };

    return purposes[tagName] || role || "content element";
  }

  /**
   * Get information about surrounding elements
   * @param {Element} element - DOM element
   * @returns {Object} Surrounding elements info
   */
  _getSurroundingElements(element) {
    const siblings = Array.from(element.parentNode?.children || []).filter(
      (el) => el !== element && el.nodeType === Node.ELEMENT_NODE
    );

    const prevSibling = element.previousElementSibling;
    const nextSibling = element.nextElementSibling;

    return {
      totalSiblings: siblings.length,
      previousElement: prevSibling ? prevSibling.tagName.toLowerCase() : null,
      nextElement: nextSibling ? nextSibling.tagName.toLowerCase() : null,
      isFirstChild: !prevSibling,
      isLastChild: !nextSibling,
    };
  }

  /**
   * Get viewport information for element
   * @param {Element} element - DOM element
   * @returns {Object} Viewport information
   */
  _getViewportInfo(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    return {
      isVisible:
        rect.top < viewportHeight &&
        rect.bottom > 0 &&
        rect.left < viewportWidth &&
        rect.right > 0,
      isAboveFold: rect.top < viewportHeight,
      distanceFromTop: Math.round(rect.top),
      size: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  }

  /**
   * Generate specific fix suggestions based on the violation
   * @param {AnalysisResult} result - Analysis result
   * @returns {Array<Object>} Fix suggestions
   */
  _generateFixSuggestions(result) {
    const suggestions = [];
    const element = result.element;

    switch (result.ruleId) {
      case "missing-alt-text":
        suggestions.push({
          type: "attribute",
          action: "Add alt attribute",
          code: `<img src="${
            element.src || "..."
          }" alt="Describe the image content">`,
          priority: "high",
        });
        if (this._isDecorativeImage(element)) {
          suggestions.push({
            type: "attribute",
            action: "Mark as decorative",
            code: `<img src="${
              element.src || "..."
            }" alt="" role="presentation">`,
            priority: "medium",
          });
        }
        break;

      case "missing-form-labels":
        const inputId = element.id || "unique-id";
        suggestions.push({
          type: "html",
          action: "Add label element",
          code: `<label for="${inputId}">Label text</label>\n<input type="${element.type}" id="${inputId}">`,
          priority: "high",
        });
        suggestions.push({
          type: "attribute",
          action: "Add aria-label",
          code: `<input type="${element.type}" aria-label="Descriptive label">`,
          priority: "medium",
        });
        break;

      case "insufficient-color-contrast":
        suggestions.push({
          type: "css",
          action: "Increase contrast",
          code: `/* Increase text color contrast */\n${result.selector} {\n  color: #000000; /* Darker text */\n  background-color: #ffffff; /* Lighter background */\n}`,
          priority: "high",
        });
        break;

      case "missing-focus-indicators":
        suggestions.push({
          type: "css",
          action: "Add focus styles",
          code: `${result.selector}:focus {\n  outline: 2px solid #005fcc;\n  outline-offset: 2px;\n}`,
          priority: "high",
        });
        break;

      case "empty-links":
        suggestions.push({
          type: "content",
          action: "Add descriptive text",
          code: `<a href="${element.href}">Meaningful link text</a>`,
          priority: "high",
        });
        suggestions.push({
          type: "attribute",
          action: "Add aria-label",
          code: `<a href="${element.href}" aria-label="Descriptive link purpose">`,
          priority: "medium",
        });
        break;

      default:
        suggestions.push({
          type: "general",
          action: result.suggestion,
          code: "",
          priority: "medium",
        });
    }

    return suggestions;
  }

  /**
   * Check if image is likely decorative
   * @param {Element} img - Image element
   * @returns {boolean} True if likely decorative
   */
  _isDecorativeImage(img) {
    const src = img.src || "";
    const decorativePatterns = [
      /spacer/i,
      /divider/i,
      /bullet/i,
      /arrow/i,
      /icon/i,
      /decoration/i,
    ];

    return decorativePatterns.some((pattern) => pattern.test(src));
  }

  /**
   * Get educational content for a violation
   * @param {AnalysisResult} result - Analysis result
   * @returns {Object} Educational content
   */
  _getEducationalContent(result) {
    const baseContent = {
      wcagLink: result.wcag
        ? `https://www.w3.org/WAI/WCAG21/Understanding/understanding-techniques.html#${result.wcag}`
        : null,
      examples: result.examples,
      resources: result.resources || [],
    };

    const educationalContent = {
      "missing-alt-text": {
        ...baseContent,
        explanation:
          "Screen readers announce images to users. Without alt text, users miss important visual information.",
        analogy:
          "Like describing a picture to someone over the phone - you need words to convey visual meaning.",
        additionalResources: [
          "https://webaim.org/articles/alt/",
          "https://www.w3.org/WAI/tutorials/images/",
        ],
      },
      "missing-form-labels": {
        ...baseContent,
        explanation:
          "Form labels tell users what information to enter. Screen readers rely on labels to identify form fields.",
        analogy:
          "Like having blank forms with no field names - users can't tell what to fill in where.",
        additionalResources: [
          "https://webaim.org/articles/forms/labels",
          "https://www.w3.org/WAI/tutorials/forms/labels/",
        ],
      },
      "insufficient-color-contrast": {
        ...baseContent,
        explanation:
          "Low contrast text is hard to read, especially for users with visual impairments or in bright conditions.",
        analogy:
          "Like reading light gray text on white paper - it strains your eyes and might be impossible to see.",
        additionalResources: [
          "https://webaim.org/articles/contrast/",
          "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
        ],
      },
    };

    return educationalContent[result.ruleId] || baseContent;
  }

  /**
   * Describe the impact on users
   * @param {AnalysisResult} result - Analysis result
   * @returns {string} User impact description
   */
  _describeUserImpact(result) {
    const impacts = {
      "missing-alt-text":
        "Screen reader users will not understand what this image shows or why it's important.",
      "missing-form-labels":
        "Screen reader users won't know what information to enter in this field.",
      "insufficient-color-contrast":
        "Users with low vision or color blindness may not be able to read this text.",
      "missing-focus-indicators":
        "Keyboard users won't know which element has focus when navigating.",
      "empty-links":
        'Screen reader users will only hear "link" without knowing where it goes.',
      "invalid-aria-attributes":
        "Screen readers may announce incorrect information or ignore the element entirely.",
      "missing-heading-structure":
        "Screen reader users rely on headings to navigate and understand page structure.",
    };

    return (
      impacts[result.ruleId] ||
      "This issue may prevent some users from accessing or understanding this content."
    );
  }

  /**
   * Get testing instructions
   * @param {AnalysisResult} result - Analysis result
   * @returns {Object} Testing instructions
   */
  _getTestingInstructions(result) {
    const instructions = {
      "missing-alt-text": {
        manual:
          "Use a screen reader to verify the image is announced meaningfully.",
        automated: "Check that img elements have non-empty alt attributes.",
        tools: ["NVDA", "JAWS", "VoiceOver"],
      },
      "missing-form-labels": {
        manual:
          "Tab to the input field and verify a screen reader announces a clear label.",
        automated: "Check that form controls have associated labels.",
        tools: ["NVDA", "JAWS", "axe-core"],
      },
      "insufficient-color-contrast": {
        manual: "Check text readability in different lighting conditions.",
        automated: "Use contrast checking tools to measure color ratios.",
        tools: ["Colour Contrast Analyser", "WebAIM Contrast Checker"],
      },
    };

    return (
      instructions[result.ruleId] || {
        manual: "Test with assistive technology to verify accessibility.",
        automated: "Use accessibility testing tools to validate compliance.",
        tools: ["Screen reader", "axe-core", "Lighthouse"],
      }
    );
  }

  /**
   * Update summary statistics
   */
  _updateSummary() {
    this.summary = {
      total: this.results.length,
      errors: this.results.filter((r) => r.severity === "error").length,
      warnings: this.results.filter((r) => r.severity === "warning").length,
      info: this.results.filter((r) => r.severity === "info").length,
      categories: this._getCategoryCounts(),
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Get counts by category
   * @returns {Object} Category counts
   */
  _getCategoryCounts() {
    const counts = {};
    this.results.forEach((result) => {
      counts[result.category] = (counts[result.category] || 0) + 1;
    });
    return counts;
  }

  /**
   * Get current summary
   * @returns {Object} Summary statistics
   */
  getSummary() {
    return { ...this.summary };
  }

  /**
   * Get results filtered by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array<ProcessedResult>} Filtered results
   */
  getFilteredResults(filters = {}) {
    let filtered = [...this.results];

    if (filters.severity) {
      const severities = Array.isArray(filters.severity)
        ? filters.severity
        : [filters.severity];
      filtered = filtered.filter((result) =>
        severities.includes(result.severity)
      );
    }

    if (filters.category) {
      const categories = Array.isArray(filters.category)
        ? filters.category
        : [filters.category];
      filtered = filtered.filter((result) =>
        categories.includes(result.category)
      );
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (result) =>
          result.name.toLowerCase().includes(search) ||
          result.message.toLowerCase().includes(search) ||
          result.description.toLowerCase().includes(search)
      );
    }

    return filtered;
  }

  /**
   * Export results in various formats
   * @param {string} format - Export format ('json', 'csv', 'html')
   * @returns {string} Exported data
   */
  exportResults(format = "json") {
    switch (format.toLowerCase()) {
      case "json":
        return this._exportJSON();
      case "csv":
        return this._exportCSV();
      case "html":
        return this._exportHTML();
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as JSON
   * @returns {string} JSON string
   */
  _exportJSON() {
    return JSON.stringify(
      {
        summary: this.summary,
        results: this.results.map((result) => ({
          ...result,
          element: undefined, // Remove DOM element reference
          elementSelector: result.selector,
        })),
      },
      null,
      2
    );
  }

  /**
   * Export as CSV
   * @returns {string} CSV string
   */
  _exportCSV() {
    const headers = [
      "Rule ID",
      "Name",
      "Severity",
      "Category",
      "WCAG",
      "Element",
      "Location",
      "Message",
      "Impact Score",
    ];

    const rows = this.results.map((result) => [
      result.ruleId,
      result.name,
      result.severity,
      result.category,
      result.wcag || "",
      result.selector,
      result.context?.location || "",
      result.message,
      result.impact || 0,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    return csvContent;
  }

  /**
   * Export as HTML report
   * @returns {string} HTML string
   */
  _exportHTML() {
    const timestamp = new Date().toLocaleString();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A11y Live Accessibility Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .error .stat-number { color: #dc3545; }
        .warning .stat-number { color: #fd7e14; }
        .info .stat-number { color: #0dcaf0; }
        .violation { border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px; padding: 20px; }
        .violation.error { border-left: 4px solid #dc3545; }
        .violation.warning { border-left: 4px solid #fd7e14; }
        .violation.info { border-left: 4px solid #0dcaf0; }
        .violation-header { display: flex; justify-content: between; align-items: start; margin-bottom: 10px; }
        .violation-title { font-weight: bold; font-size: 1.1em; margin: 0; }
        .severity-badge { padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8em; margin-left: 10px; }
        .severity-error { background: #dc3545; }
        .severity-warning { background: #fd7e14; }
        .severity-info { background: #0dcaf0; }
        .element-info { background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; }
        .suggestion { background: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; border-radius: 4px; margin-top: 10px; }
        code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 A11y Live Accessibility Report</h1>
        <p>Generated on ${timestamp}</p>
    </div>

    <div class="summary">
        <div class="stat-card error">
            <div class="stat-number">${this.summary.errors}</div>
            <div>Errors</div>
        </div>
        <div class="stat-card warning">
            <div class="stat-number">${this.summary.warnings}</div>
            <div>Warnings</div>
        </div>
        <div class="stat-card info">
            <div class="stat-number">${this.summary.info}</div>
            <div>Info</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${this.summary.total}</div>
            <div>Total Issues</div>
        </div>
    </div>

    <h2>Violations by Category</h2>
    <div class="category-summary">
        ${Object.entries(this.summary.categories)
          .map(
            ([category, count]) =>
              `<p><strong>${category}:</strong> ${count} issues</p>`
          )
          .join("")}
    </div>

    <h2>Detailed Results</h2>
    ${this.results
      .map(
        (result) => `
        <div class="violation ${result.severity}">
            <div class="violation-header">
                <h3 class="violation-title">${result.name}</h3>
                <span class="severity-badge severity-${
                  result.severity
                }">${result.severity.toUpperCase()}</span>
            </div>
            <p>${result.description}</p>
            <div class="element-info">
                <strong>Element:</strong> <code>${result.selector}</code><br>
                <strong>Location:</strong> ${
                  result.context?.location || "Unknown"
                }<br>
                <strong>WCAG:</strong> ${result.wcag || "N/A"}
            </div>
            <p><strong>Issue:</strong> ${result.message}</p>
            <div class="suggestion">
                <strong>💡 How to fix:</strong> ${result.suggestion}
            </div>
            ${
              result.userImpact
                ? `<p><strong>👥 User Impact:</strong> ${result.userImpact}</p>`
                : ""
            }
        </div>
    `
      )
      .join("")}

</body>
</html>`;
  }

  /**
   * Clear all results
   */
  clearResults() {
    this.results = [];
    this._updateSummary();
  }
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = Reporter;
} else if (typeof window !== "undefined") {
  window.Reporter = Reporter;
}
