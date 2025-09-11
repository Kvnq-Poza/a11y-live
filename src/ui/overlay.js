/**
 * A11y Live - Overlay Component
 *
 * Manages highlighting elements on the page that have accessibility violations.
 * It creates a visual overlay and a tooltip to identify the problematic element
 * and the nature of the issue.
 */
class Overlay {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.highlightEl = null;
    this.tooltipEl = null;
    this.markers = new Map(); // Store markers for all issues
  }

  initialize() {
    this._injectStyles();
    // Create the main highlight element
    this.highlightEl = document.createElement("div");
    this.highlightEl.id = "a11y-highlight";
    this.highlightEl.setAttribute("hidden", "true");

    // Create the tooltip element
    this.tooltipEl = document.createElement("div");
    this.tooltipEl.id = "a11y-tooltip";
    this.tooltipEl.setAttribute("role", "tooltip");
    this.highlightEl.appendChild(this.tooltipEl);

    document.body.appendChild(this.highlightEl);
  }

  _injectStyles() {
    if (document.getElementById("a11y-overlay-styles")) return;
    const styles = `
            #a11y-highlight {
                position: absolute;
                box-sizing: border-box;
                border: 2px dashed red;
                border-radius: 4px;
                background-color: rgba(255, 0, 0, 0.1);
                z-index: 2147483646;
                pointer-events: none;
                transition: all 0.2s ease-in-out;
            }
            #a11y-highlight.warning {
                border-color: #f59e0b;
                background-color: rgba(245, 158, 11, 0.1);
            }
            #a11y-tooltip {
                position: absolute;
                bottom: 100%;
                left: 0;
                margin-bottom: 5px;
                background-color: #1f2937;
                color: #fff;
                padding: 0.5rem 0.75rem;
                border-radius: 0.375rem;
                font-size: 0.875rem;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                white-space: nowrap;
                z-index: 1;
            }
             .a11y-issue-marker {
                position: absolute;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 1px solid white;
                box-shadow: 0 0 5px rgba(0,0,0,0.5);
                z-index: 2147483645;
                cursor: pointer;
                pointer-events: all;
            }
            .a11y-issue-marker.error { background-color: #ef4444; }
            .a11y-issue-marker.warning { background-color: #f59e0b; }
        `;
    const styleEl = document.createElement("style");
    styleEl.id = "a11y-overlay-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  /**
   * Highlights a specific element on the page.
   * @param {HTMLElement} element - The DOM element to highlight.
   * @param {Object} violation - The violation data.
   */
  highlight(element, violation) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft;

    this.highlightEl.style.top = `${rect.top + scrollTop}px`;
    this.highlightEl.style.left = `${rect.left + scrollLeft}px`;
    this.highlightEl.style.width = `${rect.width}px`;
    this.highlightEl.style.height = `${rect.height}px`;

    this.highlightEl.className = violation.severity;
    this.tooltipEl.textContent = violation.name;

    this.highlightEl.removeAttribute("hidden");
  }

  /**
   * Updates the small dot markers for all current violations.
   * @param {Array} results - The list of all current violations.
   */
  updateMarkers(results) {
    // Clear old markers that no longer exist
    const currentSelectors = new Set(results.map((r) => r.selector));
    for (const [selector, marker] of this.markers.entries()) {
      if (!currentSelectors.has(selector)) {
        marker.remove();
        this.markers.delete(selector);
      }
    }

    // Add or update markers
    results.forEach((violation) => {
      const el = document.querySelector(violation.selector);
      if (!el) return;

      let marker = this.markers.get(violation.selector);
      if (!marker) {
        marker = document.createElement("div");
        marker.className = `a11y-issue-marker ${violation.severity}`;
        marker.title = violation.name;
        document.body.appendChild(marker);
        this.markers.set(violation.selector, marker);

        marker.addEventListener("click", (e) => {
          e.stopPropagation();
          this.uiManager.showPanel();
          // This is a simplified interaction. The panel should handle selecting the issue.
          this.uiManager.panel.selectedViolation = violation;
          this.uiManager.panel._render();
          this.highlight(el, violation);
        });
      }

      const rect = el.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;
      marker.style.top = `${rect.top + scrollTop - 6}px`;
      marker.style.left = `${rect.left + scrollLeft - 6}px`;
    });
  }

  /**
   * Hides the highlight and tooltip.
   */
  hide() {
    this.highlightEl.setAttribute("hidden", "true");
  }

  cleanup() {
    if (this.highlightEl) this.highlightEl.remove();
    for (const marker of this.markers.values()) {
      marker.remove();
    }
    this.markers.clear();
    const styles = document.getElementById("a11y-overlay-styles");
    if (styles) styles.remove();
  }
}
