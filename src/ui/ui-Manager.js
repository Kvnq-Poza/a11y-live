/**
 * A11y Live - UI Manager
 *
 * Manages and coordinates all UI components, including the main panel,
 * element overlays, and the interactive tutorial. It serves as the central
 * hub for all user interface interactions and state management.
 */
class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.isInitialized = false;
    this.currentResults = [];

    // UI Components
    this.panel = null;
    this.overlay = null;
    this.tutorial = null;

    // Accessibility features
    this.announcer = null; // Live region for screen reader announcements
    this.focusTrap = null;
    this.focusHistory = [];
  }

  /**
   * Initializes all UI components and accessibility features.
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Setup accessibility features like live announcer and focus trap
      await this._setupAccessibilityFeatures();

      // Dynamically load UI component classes if they are not defined
      // This is a placeholder for a real module loading system
      if (
        typeof Panel === "undefined" ||
        typeof Overlay === "undefined" ||
        typeof Tutorial === "undefined"
      ) {
        console.warn(
          "UI Components are not loaded. Ensure panel.js, overlay.js, and tutorial.js are included."
        );
        return;
      }

      // Initialize UI components
      this.panel = new Panel(this);
      this.overlay = new Overlay(this);
      this.tutorial = new Tutorial(this);

      // Initialize each component in parallel
      await Promise.all([
        this.panel.initialize(),
        this.overlay.initialize(),
        this.tutorial.initialize(),
      ]);

      // Setup global keyboard shortcuts
      this._setupGlobalKeyboardShortcuts();

      this.isInitialized = true;
      this.announce("A11y Live panel initialized and ready.");
    } catch (error) {
      console.error("Failed to initialize UI Manager:", error);
    }
  }

  /**
   * Creates an ARIA live region for screen reader announcements and a focus trap utility.
   */
  _setupAccessibilityFeatures() {
    return new Promise((resolve) => {
      // Create ARIA live region for announcements
      this.announcer = document.createElement("div");
      this.announcer.setAttribute("aria-live", "polite");
      this.announcer.setAttribute("aria-atomic", "true");
      this.announcer.className = "a11y-sr-only"; // Use a class for screen-reader only styles
      document.body.appendChild(this.announcer);

      // Create a focus trap utility
      this.focusTrap = {
        _container: null,
        _focusableElements: [],
        _firstFocusable: null,
        _lastFocusable: null,
        _handler: (e) => this._handleFocusTrap(e),

        activate: (container) => {
          this.focusHistory.push(document.activeElement);
          this.focusTrap._container = container;
          this.focusTrap._focusableElements = Array.from(
            container.querySelectorAll(
              'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.disabled && el.offsetParent !== null);

          if (this.focusTrap._focusableElements.length > 0) {
            this.focusTrap._firstFocusable =
              this.focusTrap._focusableElements[0];
            this.focusTrap._lastFocusable =
              this.focusTrap._focusableElements[
                this.focusTrap._focusableElements.length - 1
              ];
            this.focusTrap._firstFocusable.focus();
            document.addEventListener("keydown", this.focusTrap._handler);
          }
        },
        deactivate: () => {
          document.removeEventListener("keydown", this.focusTrap._handler);
          const lastFocus = this.focusHistory.pop();
          if (lastFocus && typeof lastFocus.focus === "function") {
            lastFocus.focus();
          }
        },
      };
      resolve();
    });
  }

  /**
   * Manages focus within an activated trap.
   * @param {KeyboardEvent} e - The keyboard event.
   */
  _handleFocusTrap(e) {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.focusTrap._firstFocusable) {
        this.focusTrap._lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === this.focusTrap._lastFocusable) {
        this.focusTrap._firstFocusable.focus();
        e.preventDefault();
      }
    }
  }

  /**
   * Sets up global keyboard shortcuts for the tool.
   */
  _setupGlobalKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Global toggle shortcut (Ctrl/Cmd + Shift + A)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "a" || e.key === "A")
      ) {
        e.preventDefault();
        this.togglePanel();
      }
    });
  }

  /**
   * Updates the results in all relevant UI components.
   * @param {Array} results - The new accessibility violation results.
   */
  updateResults(results) {
    this.currentResults = Array.isArray(results) ? results : [];

    if (this.panel) {
      this.panel.updateResults(this.currentResults);
    }

    if (this.overlay) {
      this.overlay.updateMarkers(this.currentResults);
    }

    const summary = this.engine._reporter.getSummary();
    if (summary.total > 0) {
      this.announce(`Found ${summary.total} accessibility issues.`);
    } else {
      this.announce("No new accessibility violations found.");
    }
  }

  /**
   * Shows or hides the main feedback panel.
   */
  togglePanel() {
    if (!this.panel) return;
    this.panel.isVisible() ? this.hidePanel() : this.showPanel();
  }

  showPanel() {
    if (this.panel) {
      this.panel.show();
      this.announce("Accessibility panel opened.");
    }
  }

  hidePanel() {
    if (this.panel) {
      this.panel.hide();
      this.announce("Accessibility panel closed.");
    }
  }

  showTutorial() {
    if (this.tutorial) {
      this.tutorial.show();
    }
  }

  /**
   * Highlights an element on the page corresponding to a violation.
   * @param {Object} violation - The violation data object.
   */
  highlightElement(violation) {
    if (this.overlay) {
      const element = document.querySelector(violation.selector);
      if (element) {
        this.overlay.highlight(element, violation);
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        this.announce(`Highlighting element for: ${violation.name}`);
      } else {
        this.announce(
          `Could not find element to highlight for: ${violation.name}`
        );
      }
    }
  }

  clearHighlight() {
    if (this.overlay) {
      this.overlay.hide();
    }
  }

  /**
   * Sends a message to the ARIA live region for screen readers.
   * @param {string} message - The message to announce.
   * @param {string} priority - The politeness setting ('polite' or 'assertive').
   */
  announce(message, priority = "polite") {
    if (!this.announcer) return;
    this.announcer.setAttribute("aria-live", priority);

    // Clear previous message before setting new one to ensure it's read
    this.announcer.textContent = "";
    setTimeout(() => {
      this.announcer.textContent = message;
    }, 100);
  }

  /**
   * Cleans up all UI components and event listeners.
   */
  cleanup() {
    if (this.panel) this.panel.cleanup();
    if (this.overlay) this.overlay.cleanup();
    if (this.tutorial) this.tutorial.cleanup();
    if (this.announcer) this.announcer.remove();

    this.panel = null;
    this.overlay = null;
    this.tutorial = null;
    this.announcer = null;
    this.isInitialized = false;
  }
}
