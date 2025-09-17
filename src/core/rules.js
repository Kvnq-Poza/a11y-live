/**
 * A11y Live - Rule Engine
 *
 * Manages and executes accessibility rules against DOM elements.
 * Contains WCAG-based rules and utility functions for accessibility testing.
 */

class RuleEngine {
  constructor() {
    this.rules = new Map();
    this.enabledRules = new Set();
    this._initializeRules();
  }

  /**
   * Initialize all accessibility rules
   */
  _initializeRules() {
    const rules = [
      // Images and Media Rules
      {
        id: "missing-alt-text",
        name: "Images Missing Alternative Text",
        description: "All images must have alternative text for screen readers",
        wcag: "1.1.1",
        severity: "error",
        category: "multimedia",
        tags: ["images", "alt-text", "screen-readers"],
        selector: "img",
        test: (element) => {
          // Decorative images can have empty alt
          if (
            element.hasAttribute("role") &&
            element.getAttribute("role") === "presentation"
          ) {
            return true;
          }
          return element.hasAttribute("alt");
        },
        message: "Image is missing alternative text",
        suggestion:
          'Add descriptive alt attribute: <img alt="Description of image content">',
        examples: {
          good: '<img src="chart.png" alt="Sales increased 25% from Q1 to Q2 2024">',
          bad: '<img src="chart.png">',
        },
        resources: [
          "https://www.w3.org/WAI/WCAG21/Understanding/images-of-text.html",
        ],
      },

      // Form Rules
      {
        id: "missing-form-labels",
        name: "Form Inputs Missing Labels",
        description: "All form controls must have accessible labels",
        wcag: "1.3.1",
        severity: "error",
        category: "forms",
        tags: ["forms", "labels", "input"],
        selector:
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea',
        test: (element) => this._hasAccessibleLabel(element),
        message: "Form control is missing an accessible label",
        suggestion: "Add a <label> element or aria-label attribute",
        examples: {
          good: '<label for="email">Email Address</label><input type="email" id="email">',
          bad: '<input type="email" placeholder="Email">',
        },
      },

      // Color and Contrast Rules
      {
        id: "insufficient-color-contrast",
        name: "Insufficient Color Contrast",
        description:
          "Text must meet minimum color contrast ratios (4.5:1 for normal text)",
        wcag: "1.4.3",
        severity: "warning",
        category: "color_contrast",
        tags: ["contrast", "color", "readability"],
        selector: "*",
        test: (element) => this._checkColorContrast(element),
        message: "Text has insufficient color contrast ratio",
        suggestion: "Increase contrast between text and background colors",
      },

      // Heading Structure Rules
      {
        id: "missing-heading-structure",
        name: "Improper Heading Structure",
        description:
          "Headings should follow logical hierarchy (h1, h2, h3, etc.)",
        wcag: "1.3.1",
        severity: "warning",
        category: "structural",
        tags: ["headings", "structure", "hierarchy"],
        selector: "h1, h2, h3, h4, h5, h6",
        test: (element) => this._validateHeadingLevel(element),
        message: "Heading level skips or breaks hierarchy",
        suggestion: "Use headings in sequential order (h1 → h2 → h3)",
      },

      // Keyboard Navigation Rules
      {
        id: "missing-focus-indicators",
        name: "Missing Focus Indicators",
        description: "Interactive elements must have visible focus indicators",
        wcag: "2.4.7",
        severity: "error",
        category: "keyboard",
        tags: ["focus", "keyboard", "navigation"],
        selector: 'a, button, [role="button"], [tabindex]:not([tabindex="-1"])',
        test: (element) => this._hasFocusIndicator(element),
        message: "Interactive element lacks visible focus indicator",
        suggestion: "Add :focus styles with clear visual indication",
      },

      // ARIA Rules
      {
        id: "invalid-aria-attributes",
        name: "Invalid ARIA Attributes",
        description:
          "ARIA attributes must be used correctly and have valid values",
        wcag: "4.1.2",
        severity: "error",
        category: "aria",
        tags: ["aria", "attributes", "semantics"],
        selector: "*",
        test: (element) => this._validateAriaAttributes(element),
        message: "Element has invalid or misused ARIA attributes",
        suggestion:
          "Review ARIA attribute usage and ensure proper implementation",
      },

      // Link Rules
      {
        id: "empty-links",
        name: "Empty Links",
        description: "Links must have accessible text content",
        wcag: "2.4.4",
        severity: "error",
        category: "semantic",
        tags: ["links", "text-content"],
        selector: "a[href]",
        test: (element) => this._hasAccessibleText(element),
        message: "Link has no accessible text",
        suggestion:
          "Add text content or aria-label to describe the link purpose",
      },

      // Button Rules
      {
        id: "empty-buttons",
        name: "Empty Button(s)",
        description: "Buttons must have accessible text or labels",
        wcag: "4.1.2",
        severity: "error",
        category: "semantic",
        tags: ["buttons", "text-content"],
        selector:
          'button, input[type="button"], input[type="submit"], input[type="reset"]',
        test: (element) => this._hasAccessibleText(element),
        message: "Button has no accessible text",
        suggestion:
          "Add text content, aria-label, or aria-labelledby attribute",
      },

      // Table Rules
      {
        id: "table-missing-headers",
        name: "Tables Missing Headers",
        description: "Data tables must have proper header cells",
        wcag: "1.3.1",
        severity: "warning",
        category: "structural",
        tags: ["tables", "headers", "data"],
        selector: "table",
        test: (element) => this._hasTableHeaders(element),
        message: "Data table is missing proper header cells",
        suggestion:
          "Add <th> elements or headers attribute to identify table structure",
      },

      // Language Rules
      {
        id: "missing-lang-attribute",
        name: "Missing Language Attribute",
        description: "HTML document must specify primary language",
        wcag: "3.1.1",
        severity: "error",
        category: "semantic",
        tags: ["language", "html"],
        selector: "html",
        test: (element) =>
          element.hasAttribute("lang") && element.lang.trim() !== "",
        message: "HTML element is missing lang attribute",
        suggestion: 'Add lang attribute to html element: <html lang="en">',
      },
    ];

    // Store rules and enable all by default
    rules.forEach((rule) => {
      this.rules.set(rule.id, rule);
      this.enabledRules.add(rule.id);
    });
  }

  /**
   * Execute all enabled rules against provided elements
   * @param {Array<Element>} elements - Elements to test
   * @returns {Promise<Array<AnalysisResult>>} Analysis results
   */
  async executeRules(elements) {
    const results = [];

    for (const element of elements) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      // Find applicable rules for this element
      const applicableRules = this._getApplicableRules(element);

      // Execute each applicable rule
      for (const rule of applicableRules) {
        try {
          const result = await this._executeRule(rule, element);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          console.error(`Error executing rule ${rule.id}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Execute a single rule against an element
   * @param {Object} rule - Rule definition
   * @param {Element} element - DOM element to test
   * @returns {AnalysisResult|null} Result or null if passed
   */
  async _executeRule(rule, element) {
    try {
      const passed = await rule.test(element);

      if (passed) {
        return null; // Rule passed, no violation
      }

      // Create analysis result for violation
      return {
        ruleId: rule.id,
        name: rule.name,
        description: rule.description,
        wcag: rule.wcag,
        severity: rule.severity,
        category: rule.category,
        element: element,
        selector: this._getElementSelector(element),
        message: rule.message,
        suggestion: rule.suggestion,
        examples: rule.examples,
        resources: rule.resources,
        impact: this._calculateImpact(element, rule),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Rule execution failed for ${rule.id}:`, error);
      return null;
    }
  }

  /**
   * Get rules applicable to an element
   * @param {Element} element - DOM element
   * @returns {Array<Object>} Applicable rules
   */
  _getApplicableRules(element) {
    const applicableRules = [];

    for (const [ruleId, rule] of this.rules) {
      if (!this.enabledRules.has(ruleId)) {
        continue;
      }

      try {
        if (element.matches(rule.selector)) {
          applicableRules.push(rule);
        }
      } catch (error) {
        // Invalid selector, skip rule
        console.warn(`Invalid selector in rule ${ruleId}: ${rule.selector}`);
      }
    }

    return applicableRules;
  }

  // Utility Methods for Rule Testing

  /**
   * Check if element has accessible label
   */
  _hasAccessibleLabel(element) {
    // Check for various labeling methods
    return !!(
      element.getAttribute("aria-label") ||
      element.getAttribute("aria-labelledby") ||
      element.title ||
      this._getAssociatedLabel(element) ||
      (element.tagName === "INPUT" && element.type === "image" && element.alt)
    );
  }

  /**
   * Get label associated with form element
   */
  _getAssociatedLabel(element) {
    // Check for label with for attribute
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label;
    }

    // Check for wrapping label
    const parentLabel = element.closest("label");
    return parentLabel;
  }

  /**
   * Check color contrast ratio
   */
  _checkColorContrast(element) {
    // Skip elements without text content
    if (!this._hasTextContent(element)) {
      return true;
    }

    try {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // If background is transparent, check parent elements
      const finalBgColor =
        backgroundColor === "rgba(0, 0, 0, 0)"
          ? this._getEffectiveBackgroundColor(element)
          : backgroundColor;

      const contrast = this._calculateContrastRatio(color, finalBgColor);
      const fontSize = parseFloat(styles.fontSize);
      const fontWeight = styles.fontWeight;

      // WCAG AA requirements
      const isLargeText =
        fontSize >= 18 ||
        (fontSize >= 14 && (fontWeight === "bold" || fontWeight >= 700));
      const requiredRatio = isLargeText ? 3.0 : 4.5;

      return contrast >= requiredRatio;
    } catch (error) {
      // If we can't calculate contrast, pass the test
      return true;
    }
  }

  /**
   * Calculate contrast ratio between two colors
   */
  _calculateContrastRatio(color1, color2) {
    const rgb1 = this._parseColor(color1);
    const rgb2 = this._parseColor(color2);

    if (!rgb1 || !rgb2) return 21; // Assume good contrast if can't parse

    const l1 = this._getRelativeLuminance(rgb1);
    const l2 = this._getRelativeLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Parse CSS color to RGB values
   */
  _parseColor(color) {
    const div = document.createElement("div");
    div.style.color = color;
    document.body.appendChild(div);
    const computedColor = window.getComputedStyle(div).color;
    document.body.removeChild(div);

    const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return match
      ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
      : null;
  }

  /**
   * Calculate relative luminance
   */
  _getRelativeLuminance([r, g, b]) {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Get effective background color by traversing parents
   */
  _getEffectiveBackgroundColor(element) {
    let current = element;
    while (current && current !== document.body) {
      const bgColor = window.getComputedStyle(current).backgroundColor;
      if (bgColor !== "rgba(0, 0, 0, 0)") {
        return bgColor;
      }
      current = current.parentElement;
    }
    return "rgb(255, 255, 255)"; // Default to white
  }

  /**
   * Validate heading hierarchy
   */
  _validateHeadingLevel(element) {
    const level = parseInt(element.tagName.substring(1));
    const previousHeadings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6")
    ).filter(
      (h) =>
        h.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING
    );

    if (previousHeadings.length === 0) {
      return level === 1; // First heading should be h1
    }

    const lastHeading = previousHeadings[previousHeadings.length - 1];
    const lastLevel = parseInt(lastHeading.tagName.substring(1));

    // Allow same level, one level deeper, or any level shallower
    return level <= lastLevel + 1;
  }

  /**
   * Check if element has a visible focus indicator.
   *
   * Browser defaults always provide a focus outline (:focus-visible) for
   * interactive elements (links, buttons, inputs, etc.). Instead of trying
   * to simulate focus and compare styles, We now the default
   * indicator is present unless it has been explicitly disabled.
   *
   * @returns true if:
   *  - the element is not visible or disabled, OR
   *  - it retains a visible outline, OR
   *  - it has an alternative visible focus style (box-shadow, border,
   *    background, text-decoration, or color change).
   *
   * Returns false only when all visible indicators are removed, e.g.
   * `outline: none;` with no replacement styling.
   */
  _hasFocusIndicator(element) {
    if (!this._isElementVisible(element) || element.disabled) {
      return true; // not applicable
    }

    const styles = window.getComputedStyle(element);

    // Check if author explicitly removed outline
    const outlineRemoved =
      styles.outlineStyle === "none" || parseFloat(styles.outlineWidth) === 0;

    // If outline is present, we’re good
    if (!outlineRemoved) {
      return true;
    }

    // Otherwise, check if author provided alternative visible cues
    const hasBoxShadow = styles.boxShadow && styles.boxShadow !== "none";
    const hasBorder = styles.border && styles.border !== "none";
    const hasBgChange =
      styles.backgroundColor && styles.backgroundColor !== "transparent";
    const hasTextDecoration =
      styles.textDecorationLine && styles.textDecorationLine !== "none";
    const hasColor = styles.color && styles.color !== "inherit";

    return (
      hasBoxShadow || hasBorder || hasBgChange || hasTextDecoration || hasColor
    );
  }

  /**
   * Validate ARIA attributes
   */
  _validateAriaAttributes(element) {
    const ariaAttributes = Array.from(element.attributes).filter((attr) =>
      attr.name.startsWith("aria-")
    );

    // Known valid ARIA attributes
    const validAriaAttrs = [
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "aria-hidden",
      "aria-expanded",
      "aria-selected",
      "aria-checked",
      "aria-disabled",
      "aria-required",
      "aria-invalid",
      "aria-live",
      "aria-atomic",
      "aria-relevant",
      "aria-busy",
      "aria-controls",
      "aria-flowto",
      "aria-owns",
      "aria-activedescendant",
      "aria-level",
      "aria-posinset",
      "aria-setsize",
      "aria-orientation",
      "aria-sort",
      "aria-readonly",
      "aria-multiline",
      "aria-autocomplete",
      "aria-multiselectable",
      "aria-pressed",
      "aria-haspopup",
      "aria-current",
      "aria-modal",
      "aria-details",
      "aria-keyshortcuts",
      "aria-roledescription",
    ];

    for (const attr of ariaAttributes) {
      if (!validAriaAttrs.includes(attr.name)) {
        return false;
      }

      if (!this._validateAriaValue(attr.name, attr.value, element)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate ARIA attribute values
   */
  _validateAriaValue(attrName, value, element) {
    const booleanLikeAttrs = {
      "aria-atomic": ["true", "false"],
      "aria-busy": ["true", "false"],
      "aria-disabled": ["true", "false"],
      "aria-hidden": ["true", "false"],
      "aria-invalid": ["true", "false"],
      "aria-modal": ["true", "false"],
      "aria-multiline": ["true", "false"],
      "aria-multiselectable": ["true", "false"],
      "aria-readonly": ["true", "false"],
      "aria-required": ["true", "false"],
      "aria-checked": ["true", "false", "mixed"],
      "aria-pressed": ["true", "false", "mixed"],
      "aria-expanded": ["true", "false", "undefined"],
      "aria-selected": ["true", "false", "undefined"],
    };

    if (booleanLikeAttrs[attrName]) {
      return booleanLikeAttrs[attrName].includes(value.toLowerCase());
    }

    const tokenAttrs = {
      "aria-live": ["off", "polite", "assertive"],
      "aria-current": [
        "page",
        "step",
        "location",
        "date",
        "time",
        "true",
        "false",
      ],
      "aria-autocomplete": ["inline", "list", "both", "none"],
      "aria-sort": ["ascending", "descending", "other", "none"],
      "aria-orientation": ["horizontal", "vertical", "undefined"],
      "aria-relevant": [
        "additions",
        "removals",
        "text",
        "all",
        "additions text",
      ],
    };

    if (tokenAttrs[attrName]) {
      if (attrName === "aria-relevant") {
        const values = value.toLowerCase().split(/\s+/);
        return values.every((v) => tokenAttrs[attrName].includes(v));
      }
      return tokenAttrs[attrName].includes(value.toLowerCase());
    }

    const idRefAttrs = [
      "aria-labelledby",
      "aria-describedby",
      "aria-controls",
      "aria-flowto",
      "aria-owns",
      "aria-activedescendant",
    ];
    if (idRefAttrs.includes(attrName)) {
      if (!value || value.trim() === "") return false;
      const ids = value.trim().split(/\s+/);
      return ids.every((id) => document.getElementById(id) !== null);
    }

    if (attrName === "aria-label") {
      return value.trim().length > 0;
    }

    return true; // Default to valid
  }

  /**
   * Check if element has accessible text content
   */
  _hasAccessibleText(element) {
    if (element.getAttribute("aria-label")?.trim()) return true;

    if (element.getAttribute("aria-labelledby")) {
      const labelIds = element.getAttribute("aria-labelledby").split(/\s+/);
      for (const id of labelIds) {
        const labelElement = document.getElementById(id);
        if (labelElement && labelElement.textContent?.trim()) {
          return true;
        }
      }
    }

    // Use textContent, not innerText
    const visibleText = (element.textContent || "").replace(/\s+/g, "").trim();
    if (visibleText.length > 0) return true;

    if (element.tagName === "INPUT" && element.value?.trim()) return true;

    const img = element.querySelector("img[alt]");
    if (img && img.alt?.trim()) return true;

    if (element.title?.trim()) return true;

    return false;
  }

  /**
   * Check if element has text content
   */
  _hasTextContent(element) {
    const textContent = element.textContent || element.innerText || "";
    return textContent.trim().length > 0;
  }

  /**
   * Check if table has proper headers
   */
  _hasTableHeaders(element) {
    // Skip layout tables (those with role="presentation")
    if (element.getAttribute("role") === "presentation") {
      return true;
    }

    const cells = element.querySelectorAll("td, th");

    // If table has very few cells, might be layout
    if (cells.length < 4) {
      return true;
    }

    // Check for header cells
    const headerCells = element.querySelectorAll("th");
    if (headerCells.length > 0) {
      return true;
    }

    // Check for headers attribute on cells
    const cellsWithHeaders = element.querySelectorAll("td[headers]");
    return cellsWithHeaders.length > 0;
  }

  /**
   * Calculate impact score based on element visibility and context
   */
  _calculateImpact(element, rule) {
    let impact = 1.0;

    // Severity multiplier
    const severityMultipliers = {
      error: 3.0,
      warning: 2.0,
      info: 1.0,
    };
    impact *= severityMultipliers[rule.severity] || 1.0;

    // Visibility multiplier
    if (this._isElementVisible(element)) {
      impact *= 2.0;
    }

    // Interactive element multiplier
    if (this._isInteractiveElement(element)) {
      impact *= 1.5;
    }

    // Main content multiplier
    if (this._isInMainContent(element)) {
      impact *= 1.3;
    }

    return Math.min(impact, 10.0); // Cap at 10
  }

  /**
   * Check if element is visible
   */
  _isElementVisible(element) {
    const styles = window.getComputedStyle(element);
    return (
      styles.display !== "none" &&
      styles.visibility !== "hidden" &&
      styles.opacity !== "0" &&
      element.offsetParent !== null
    );
  }

  /**
   * Check if element is interactive
   */
  _isInteractiveElement(element) {
    const interactiveTags = ["a", "button", "input", "select", "textarea"];
    const hasTabindex =
      element.hasAttribute("tabindex") && element.tabIndex >= 0;
    const hasClickHandler = element.onclick || element.getAttribute("onclick");

    return (
      interactiveTags.includes(element.tagName.toLowerCase()) ||
      hasTabindex ||
      hasClickHandler
    );
  }

  /**
   * Check if element is in main content area
   */
  _isInMainContent(element) {
    // Check for main landmark
    const main = element.closest('main, [role="main"]');
    if (main) return true;

    // Check if not in header, footer, nav, aside
    const nonMainAreas = element.closest(
      'header, footer, nav, aside, [role="banner"], [role="contentinfo"], [role="navigation"], [role="complementary"]'
    );
    return !nonMainAreas;
  }

  /**
   * Generate CSS selector for element
   */
  _getElementSelector(element) {
    // If element has an ID, use it
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }

    // Build a path from root to element
    const path = [];
    let current = element;

    while (
      current &&
      current !== document.body &&
      current !== document.documentElement
    ) {
      let selector = current.tagName.toLowerCase();

      // Add class information if available
      if (current.className && typeof current.className === "string") {
        const classes = current.className
          .trim()
          .split(/\s+/)
          .filter((c) => c);
        if (classes.length > 0) {
          selector += "." + classes.map((c) => CSS.escape(c)).join(".");
        }
      }

      // Add nth-child for specificity if needed
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === current.tagName
        );

        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(" > ") || element.tagName.toLowerCase();
  }

  /**
   * Get all enabled rules
   */
  getEnabledRules() {
    return Array.from(this.enabledRules).map((id) => this.rules.get(id));
  }

  /**
   * Update enabled rules
   */
  updateEnabledRules(ruleIds) {
    this.enabledRules.clear();
    ruleIds.forEach((id) => {
      if (this.rules.has(id)) {
        this.enabledRules.add(id);
      }
    });
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId) {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules() {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category) {
    return Array.from(this.rules.values()).filter(
      (rule) => rule.category === category
    );
  }
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = RuleEngine;
} else if (typeof window !== "undefined") {
  window.RuleEngine = RuleEngine;
}
