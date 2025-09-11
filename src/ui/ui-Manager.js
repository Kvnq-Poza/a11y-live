class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.isInitialized = false;
    this.panel = null;
    this.overlayContainer = null;
    this.activeOverlays = new Map();
    this.isPanelVisible = true;
    this.currentResults = [];
    this.activeFilters = { severity: [], search: "" };
  }

  async initialize() {
    if (this.isInitialized) return;

    await this._injectStyles();
    this._createPanel();
    this._createOverlayContainer();
    this._setupEventListeners();

    this.isInitialized = true;
  }

  async _injectStyles() {
    if (document.getElementById("a11y-live-styles")) return;

    const styles = `
                    #a11y-live-panel {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        z-index: 999999;
                        background: white;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 14px;
                        color: #374151;
                        width: 400px;
                        max-height: 600px;
                        display: flex;
                        flex-direction: column;
                    }

                    .a11y-panel-header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .a11y-panel-title {
                        font-weight: 600;
                        font-size: 16px;
                        margin: 0;
                    }

                    .a11y-panel-summary {
                        font-size: 12px;
                        opacity: 0.9;
                        margin-top: 2px;
                    }

                    .a11y-panel-controls button {
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        width: 24px;
                        height: 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-left: 8px;
                    }

                    .a11y-panel-controls button:hover {
                        background: rgba(255, 255, 255, 0.3);
                    }

                    .a11y-panel-content {
                        flex: 1;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    }

                    .a11y-results-list {
                        flex: 1;
                        overflow-y: auto;
                        padding: 16px;
                    }

                    .a11y-violation-item {
                        border: 1px solid #e5e7eb;
                        border-radius: 6px;
                        margin-bottom: 12px;
                        padding: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .a11y-violation-item:hover {
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        transform: translateY(-1px);
                    }

                    .a11y-violation-item.error {
                        border-left: 4px solid #dc2626;
                    }

                    .a11y-violation-item.warning {
                        border-left: 4px solid #d97706;
                    }

                    .a11y-violation-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: start;
                        margin-bottom: 6px;
                    }

                    .a11y-violation-title {
                        font-weight: 500;
                        font-size: 13px;
                        margin: 0;
                        flex: 1;
                    }

                    .a11y-severity-badge {
                        padding: 2px 6px;
                        border-radius: 10px;
                        font-size: 10px;
                        font-weight: 500;
                        text-transform: uppercase;
                        margin-left: 8px;
                    }

                    .a11y-severity-error {
                        background: #fee2e2;
                        color: #991b1b;
                    }

                    .a11y-severity-warning {
                        background: #fef3c7;
                        color: #92400e;
                    }

                    .a11y-violation-message {
                        font-size: 12px;
                        color: #6b7280;
                        margin: 0 0 8px 0;
                    }

                    .a11y-violation-element {
                        background: #f3f4f6;
                        padding: 6px 8px;
                        border-radius: 4px;
                        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                        font-size: 11px;
                        margin-bottom: 8px;
                    }

                    .a11y-element-overlay {
                        position: absolute;
                        border: 2px solid;
                        border-radius: 4px;
                        pointer-events: none;
                        transition: all 0.2s;
                        box-sizing: border-box;
                        z-index: 999998;
                    }

                    .a11y-element-overlay.error {
                        border-color: #dc2626;
                        background: rgba(220, 38, 38, 0.1);
                        animation: a11y-pulse-error 2s infinite;
                    }

                    .a11y-element-overlay.warning {
                        border-color: #d97706;
                        background: rgba(217, 119, 6, 0.1);
                    }

                    @keyframes a11y-pulse-error {
                        0%, 100% { opacity: 0.8; }
                        50% { opacity: 0.4; }
                    }

                    .a11y-empty-state {
                        text-align: center;
                        padding: 40px 20px;
                        color: #6b7280;
                    }

                    .a11y-empty-state p:first-child {
                        font-size: 16px;
                        margin-bottom: 8px;
                    }

                    @media (max-width: 768px) {
                        #a11y-live-panel {
                            position: fixed;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            top: auto;
                            width: auto;
                            max-height: 50vh;
                            border-radius: 8px 8px 0 0;
                        }
                    }
                `;

    const styleElement = document.createElement("style");
    styleElement.id = "a11y-live-styles";
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  _createPanel() {
    const existing = document.getElementById("a11y-live-panel");
    if (existing) existing.remove();

    this.panel = document.createElement("div");
    this.panel.id = "a11y-live-panel";

    this.panel.innerHTML = `
                    <div class="a11y-panel-header">
                        <div>
                            <h2 class="a11y-panel-title">🎯 A11y Live</h2>
                            <div class="a11y-panel-summary">0 issues found</div>
                        </div>
                        <div class="a11y-panel-controls">
                            <button id="a11y-minimize-btn" title="Minimize">−</button>
                            <button id="a11y-close-btn" title="Close">×</button>
                        </div>
                    </div>
                    <div class="a11y-panel-content">
                        <div class="a11y-results-list">
                            <div class="a11y-empty-state">
                                <p>🎉 No accessibility violations found!</p>
                                <p>Keep up the great work making the web accessible.</p>
                            </div>
                        </div>
                    </div>
                `;

    document.body.appendChild(this.panel);
    this._setupPanelEvents();
  }

  _createOverlayContainer() {
    const existing = document.getElementById("a11y-overlay-container");
    if (existing) existing.remove();

    this.overlayContainer = document.createElement("div");
    this.overlayContainer.id = "a11y-overlay-container";
    this.overlayContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                `;
    document.body.appendChild(this.overlayContainer);
  }

  _setupEventListeners() {
    window.addEventListener("resize", () => this._updateOverlayPositions());
    window.addEventListener("scroll", () => this._updateOverlayPositions());
  }

  _setupPanelEvents() {
    const minimizeBtn = this.panel.querySelector("#a11y-minimize-btn");
    const closeBtn = this.panel.querySelector("#a11y-close-btn");

    minimizeBtn.addEventListener("click", () => this._togglePanelMinimize());
    closeBtn.addEventListener("click", () => this._closePanel());
  }

  updateResults(results) {
    // 🔑 Always overwrite results
    this.currentResults = Array.isArray(results) ? results : [];

    // Make sure panel is visible again when new results arrive
    if (this.panel && !this.isPanelVisible) {
      this.showPanel();
    }

    this._updatePanelSummary();
    this._renderResults();
    this._updateOverlays();
  }

  _updatePanelSummary() {
    const summary = this.engine._reporter.getSummary();
    const summaryElement = this.panel.querySelector(".a11y-panel-summary");

    if (summary.total === 0) {
      summaryElement.textContent = "No issues found";
    } else {
      const parts = [];
      if (summary.errors > 0) parts.push(`${summary.errors} errors`);
      if (summary.warnings > 0) parts.push(`${summary.warnings} warnings`);
      summaryElement.textContent = parts.join(", ");
    }
  }

  _renderResults() {
    const resultsList = this.panel.querySelector(".a11y-results-list");

    if (this.currentResults.length === 0) {
      resultsList.innerHTML = `
                        <div class="a11y-empty-state">
                            <p>🎉 No accessibility violations found!</p>
                            <p>Keep up the great work making the web accessible.</p>
                        </div>
                    `;
      return;
    }

    resultsList.innerHTML = this.currentResults
      .map(
        (result) => `
                    <div class="a11y-violation-item ${result.severity}" data-rule="${result.ruleId}">
                        <div class="a11y-violation-header">
                            <h3 class="a11y-violation-title">${result.name}</h3>
                            <span class="a11y-severity-badge a11y-severity-${result.severity}">${result.severity}</span>
                        </div>
                        <p class="a11y-violation-message">${result.message}</p>
                        <div class="a11y-violation-element">${result.selector}</div>
                    </div>
                `
      )
      .join("");

    // Add click listeners
    resultsList
      .querySelectorAll(".a11y-violation-item")
      .forEach((item, index) => {
        item.addEventListener("click", () => {
          const result = this.currentResults[index];
          this._highlightElement(result.element, result.severity);
          this._scrollToElement(result.element);
        });
      });
  }

  _updateOverlays() {
    this._clearOverlays();

    this.currentResults.forEach((result) => {
      if (result.element && this._isElementVisible(result.element)) {
        this._createOverlay(result.element, result.severity);
      }
    });
  }

  _createOverlay(element, severity) {
    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;

    const overlay = document.createElement("div");
    overlay.className = `a11y-element-overlay ${severity}`;
    overlay.style.left = `${rect.left + scrollX}px`;
    overlay.style.top = `${rect.top + scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    this.overlayContainer.appendChild(overlay);
    this.activeOverlays.set(element, overlay);
  }

  _highlightElement(element, severity) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // Create temporary highlight
    const highlight = document.createElement("div");
    highlight.className = `a11y-element-overlay ${severity}`;
    highlight.style.border = "3px solid";
    highlight.style.zIndex = "1000000";

    const rect = element.getBoundingClientRect();
    highlight.style.left = `${rect.left + window.pageXOffset}px`;
    highlight.style.top = `${rect.top + window.pageYOffset}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;

    this.overlayContainer.appendChild(highlight);

    setTimeout(() => {
      if (highlight.parentNode) {
        highlight.parentNode.removeChild(highlight);
      }
    }, 3000);
  }

  _scrollToElement(element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }

  _clearOverlays() {
    this.overlayContainer.innerHTML = "";
    this.activeOverlays.clear();
  }

  _updateOverlayPositions() {
    this.activeOverlays.forEach((overlay, element) => {
      if (this._isElementVisible(element)) {
        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset;
        const scrollY = window.pageYOffset;

        overlay.style.left = `${rect.left + scrollX}px`;
        overlay.style.top = `${rect.top + scrollY}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.display = "";
      } else {
        overlay.style.display = "none";
      }
    });
  }

  _isElementVisible(element) {
    if (!element || !element.offsetParent) return false;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    return (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < viewportHeight &&
      rect.left < viewportWidth
    );
  }

  _togglePanelMinimize() {
    const content = this.panel.querySelector(".a11y-panel-content");
    const btn = this.panel.querySelector("#a11y-minimize-btn");

    if (content.style.display === "none") {
      content.style.display = "";
      btn.textContent = "−";
    } else {
      content.style.display = "none";
      btn.textContent = "+";
    }
  }

  _closePanel() {
    this.panel.style.display = "none";
    this._clearOverlays();
    this.isPanelVisible = false;
  }

  isClosed() {
    return !this.isPanelVisible;
  }

  showPanel() {
    if (this.panel) {
      this.panel.style.display = "flex";
      this.isPanelVisible = true;
    }
  }

  cleanup() {
    if (this.panel) {
      this.panel.remove();
    }
    if (this.overlayContainer) {
      this.overlayContainer.remove();
    }
    const styles = document.getElementById("a11y-live-styles");
    if (styles) {
      styles.remove();
    }
    this.activeOverlays.clear();
    this.isInitialized = false;
  }
}
