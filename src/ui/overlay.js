/**
 * A11y Live - Overlay Component
 *
 * Manages highlighting elements on the page that have accessibility violations.
 * It creates a visual overlay and a tooltip to identify the problematic element
 * and the nature of the issue. Markers now stay attached to elements during scroll.
 */
class Overlay {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.highlightEl = null;
    this.tooltipEl = null;
    this.markers = new Map(); // Store markers for all issues
    this.scrollHandler = null;
    this.resizeHandler = null;
    this.isUpdatingMarkers = false;
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

    // Set up scroll and resize handlers to keep markers in sync
    this._setupEventHandlers();
  }

  _injectStyles() {
    if (document.getElementById("a11y-overlay-styles")) return;
    const styles = `
#a11y-highlight{
  position:absolute;
  box-sizing:border-box;
  border:2px dashed red;
  border-radius:4px;
  background-color:rgba(255,0,0,0.1);
  z-index:2147483646;
  pointer-events:none;
  transition:all .2s ease-in-out;
}
#a11y-highlight.warning{
  border-color:#f59e0b;
  background-color:rgba(245,158,11,0.1);
}
#a11y-tooltip{
  position:absolute;
  bottom:100%;
  left:0;
  margin-bottom:5px;
  background-color:#1f2937;
  color:#fff;
  padding:8px 12px;
  border-radius:6px;
  font-size:14px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  white-space:nowrap;
  z-index:1;
  line-height:22px;
}
.a11y-issue-marker{
  position:absolute;
  width:12px;
  height:12px;
  border-radius:50%;
  border:1px solid #fff;
  box-shadow:0 0 5px rgba(0,0,0,0.5);
  z-index:2147483645;
  cursor:pointer;
  pointer-events:all;
  transition:opacity .2s ease-in-out;
}
.a11y-issue-marker.error{
  background-color:#ef4444;
}
.a11y-issue-marker.warning{
  background-color:#f59e0b;
}
.a11y-issue-marker.info{
  background-color:#0b55f5;
}
.a11y-issue-marker.hidden{
  opacity:0;
  pointer-events:none;
}
`;

    const styleEl = document.createElement("style");
    styleEl.id = "a11y-overlay-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  /**
   * Sets up event handlers for scroll and resize to keep markers in sync
   */
  _setupEventHandlers() {
    // Throttled scroll handler to update marker positions
    this.scrollHandler = this._throttle(() => {
      if (!this.isUpdatingMarkers) {
        this._updateMarkerPositions();
      }
    }, 16); // ~60fps

    // Throttled resize handler
    this.resizeHandler = this._throttle(() => {
      if (!this.isUpdatingMarkers) {
        this._updateMarkerPositions();
      }
    }, 100);

    // Listen to scroll events on window and any scrollable containers
    window.addEventListener("scroll", this.scrollHandler, { passive: true });
    window.addEventListener("resize", this.resizeHandler, { passive: true });

    // Also listen for scroll events on any scrollable elements
    document.addEventListener("scroll", this.scrollHandler, {
      passive: true,
      capture: true,
    });
  }

  /**
   * Throttle function to limit the frequency of function calls
   */
  _throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Updates marker positions for all currently visible markers
   */
  _updateMarkerPositions() {
    for (const [key, markerData] of this.markers.entries()) {
      const { marker, violation } = markerData;
      const element = document.querySelector(violation.selector);

      if (element && this._isElementVisible(element)) {
        this._positionMarker(marker, element);
        marker.classList.remove("hidden");
      } else {
        // Hide marker if element is not visible or doesn't exist
        marker.classList.add("hidden");
      }
    }
  }

  /**
   * Checks if an element is visible in the viewport
   */
  _isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const windowWidth =
      window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= windowHeight &&
      rect.left <= windowWidth &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  /**
   * Positions a marker relative to its target element
   */
  _positionMarker(marker, element) {
    const rect = element.getBoundingClientRect();
    const markerSize = 12;

    // Position marker at the top-left corner of the element
    // Use fixed positioning to stay relative to viewport
    marker.style.position = "fixed";
    marker.style.top = `${rect.top - markerSize / 2}px`;
    marker.style.left = `${rect.left - markerSize / 2}px`;
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
   * Ensures each violation has its own marker, positioned correctly and staying with elements.
   * @param {Array} results - The list of all current violations.
   */
  updateMarkers(results) {
    this.isUpdatingMarkers = true;

    // Build a set of active keys (selector::ruleId)
    const activeKeys = new Set(
      results.map((r) => `${r.selector}::${r.ruleId}`)
    );

    // Remove old markers no longer in results
    for (const [key, markerData] of this.markers.entries()) {
      if (!activeKeys.has(key)) {
        markerData.marker.remove();
        this.markers.delete(key);
      }
    }

    // Add or update markers
    results.forEach((violation) => {
      const element = document.querySelector(violation.selector);
      if (!element) return;

      const key = `${violation.selector}::${violation.ruleId}`;
      let markerData = this.markers.get(key);

      if (!markerData) {
        const marker = document.createElement("div");
        marker.className = `a11y-issue-marker ${violation.severity}`;
        marker.title = violation.name;
        document.body.appendChild(marker);

        markerData = { marker, violation };
        this.markers.set(key, markerData);

        marker.addEventListener("click", (e) => {
          e.stopPropagation();
          this.uiManager.showPanel();
          this.uiManager.panel.selectedViolation = violation;
          this.uiManager.panel._render();
          this.highlight(element, violation);
        });
      } else {
        // Update existing marker data in case violation details changed
        markerData.violation = violation;
        markerData.marker.title = violation.name;
        markerData.marker.className = `a11y-issue-marker ${violation.severity}`;
      }

      // Position the marker
      if (this._isElementVisible(element)) {
        this._positionMarker(markerData.marker, element);
        markerData.marker.classList.remove("hidden");
      } else {
        markerData.marker.classList.add("hidden");
      }
    });

    this.isUpdatingMarkers = false;
  }

  /**
   * Hides the highlight and tooltip.
   */
  hide() {
    this.highlightEl.setAttribute("hidden", "true");
  }

  cleanup() {
    // Remove event listeners
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
      window.removeEventListener("resize", this.resizeHandler);
      document.removeEventListener("scroll", this.scrollHandler, true);
    }

    // Clean up elements
    if (this.highlightEl) this.highlightEl.remove();
    for (const markerData of this.markers.values()) {
      markerData.marker.remove();
    }
    this.markers.clear();

    const styles = document.getElementById("a11y-overlay-styles");
    if (styles) styles.remove();
  }
}
