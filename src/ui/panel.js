/**
 * A11y Live - Panel Component
 *
 * Renders the main feedback panel that displays accessibility violations.
 * It provides features for filtering, searching, and viewing detailed
 * information about each violation.
 */
class Panel {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.engine = uiManager.engine;
    this._isVisible = false;
    this.panelElement = null;
    this.currentResults = [];
    this.activeFilters = { severity: [], search: "" };
    this.selectedViolation = null;
  }

  async initialize() {
    this._injectStyles();
    this._createPanel();
    this._setupEventListeners();
  }

  _injectStyles() {
    if (document.getElementById("a11y-panel-styles")) return;
    const styles = `
      .a11y-sr-only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border-width: 0 !important; }
      #a11y-live-panel { display: flex !important; flex-direction: column !important; position: fixed !important; right: 16px !important; bottom: 16px !important; width: 450px !important; max-width: 90vw !important; height: 600px !important; max-height: 70vh !important; background-color: #fff !important; border-radius: 12px !important; box-shadow: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05) !important; border: 1px solid #e5e7eb !important; z-index: 2147483647 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; color: #1f2937 !important; transform: translateY(32px) !important; opacity: 0 !important; visibility: hidden !important; transition: transform 0.3s ease, opacity 0.3s ease, visibility 0s linear 0.3s !important; }
      #a11y-panel-title {font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;}
      #a11y-live-panel.visible { transform: translateY(0) !important; opacity: 1 !important; visibility: visible !important; transition: transform 0.3s ease, opacity 0.3s ease, visibility 0s !important; }
      .a11y-panel-header { display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 12px 20px !important; border-bottom: 1px solid #e5e7eb !important; background-color: #f9fafb !important; border-radius: 12px 12px 0 0 !important; }
      .a11y-panel-header h2 { font-size: 18px !important; font-weight: 600 !important; margin: 0 !important; line-height: 1.4 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; color: #1f2937 !important; }
      .a11y-panel-controls button { background: none !important; border: 1px solid transparent !important; border-radius: 6px !important; padding: 8px !important; cursor: pointer !important; color: #6b7280 !important; transition: background-color 0.2s !important; font-size: 14px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
      .a11y-panel-controls button:hover { background-color: #f3f4f6 !important; color: #1f2937 !important; }
      .a11y-panel-main { display: flex !important; flex: 1 !important; overflow: hidden !important; }
      .a11y-sidebar { width: 100%; border-right: 1px solid #e5e7eb !important; display: flex !important; flex-direction: column !important; transition: width 0.3s ease !important; }
      .a11y-sidebar.collapsed { width: 0 !important; }
      .a11y-toolbar { padding: 12px !important; border-bottom: 1px solid #e5e7eb !important; background-color: #f9fafb !important; }
      .a11y-search-input { width: 100% !important; padding: 8px 12px !important; border: 1px solid #d1d5db !important; border-radius: 6px !important; font-size: 14px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; color: #1f2937 !important; line-height: 1.4 !important; }
      .a11y-filter-group { display: flex !important; justify-content: space-around !important; margin-top: 8px !important; }
      .a11y-filter-button { flex: 1 !important; background-color: #fff !important; border: 1px solid #d1d5db !important; padding: 6px 0 !important; font-size: 12px !important; cursor: pointer !important; transition: background-color 0.2s !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; color: #1f2937 !important; line-height: 1.4 !important; }
      .a11y-filter-button:first-child { border-radius: 6px 0 0 6px !important; }
      .a11y-filter-button:last-child { border-radius: 0 6px 6px 0 !important; border-left: 0 !important; }
      .a11y-filter-button.active { background-color: #e5e7eb !important; font-weight: 600 !important; }
      .a11y-results-list { list-style: none !important; padding: 0 !important; margin: 0 !important; flex: 1 !important; overflow-y: auto !important; }
      .a11y-violation-item { padding: 16px !important; border-bottom: 1px solid #f3f4f6 !important; cursor: pointer !important; }
      .a11y-violation-item:hover { background-color: #f9fafb !important; }
      .a11y-violation-item.selected { background-color: #eff6ff !important; border-left: 4px solid #3b82f6 !important; padding-left: 12px !important; }
      .a11y-violation-title { font-weight: 600 !important; margin-bottom: 4px !important; font-size: 14px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; color: #1f2937 !important; line-height: 1.4 !important; }
      .a11y-violation-meta { font-size: 12px !important; line-height: 17px !important; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; line-height: 1.4 !important; }
      .a11y-detail-view { flex: 1 !important; padding: 24px !important; overflow-y: auto !important; background-color: #f9fafb !important; }
      .a11y-detail-view.hidden { display: none !important; }
      .a11y-detail-header { border-bottom: 1px solid #e5e7eb !important; padding-bottom: 16px !important; margin-bottom: 16px !important; }
      .a11y-detail-title { font-size: 20px !important; font-weight: 600 !important; max-height: fit-content !important; margin-bottom: 8px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; color: #1f2937 !important; line-height: 1.4 !important; }
      .a11y-tag { display: inline-block !important; padding: 4px 10px !important; font-size: 10.5px !important; font-weight: 500 !important; border-radius: 9999px !important; margin-right: 8px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; line-height: 1.4 !important; }
      .a11y-tag-error { background-color: #fee2e2 !important; color: #991b1b !important; }
      .a11y-tag-warning { background-color: #fef3c7 !important; color: #92400e !important; }
      .a11y-tag-info { background-color: #efefee !important; color: #0b55f5 !important; }
      .a11y-tag-wcag { background-color: #dbeafe !important; color: #1e40af !important; }
      .a11y-detail-section { margin-bottom: 24px !important; }
      .a11y-detail-section h3 { font-size: 14px !important; font-weight: 600 !important; text-transform: uppercase !important; color: #6b7280 !important; margin-bottom: 12px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; line-height: 1.4 !important; }
      .a11y-detail-section p, .a11y-detail-section ul { font-size: 14px !important; color: #374151 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; margin-bottom: 12px !important; line-height: 15px !important; }
      .a11y-code-block { position: relative !important; background-color: #1f2937 !important; color: #f3f4f6 !important; padding: 24px 16px !important; border-radius: 8px !important; font-family: "Courier New", monospace !important; font-size: 14px !important; margin-bottom: 12px !important; }
      .a11y-code-block button.copy-btn { position: absolute !important; top: 8px !important; right: 8px !important; background: #374151 !important; color: #f9fafb !important; border: none !important; border-radius: 6px !important; padding: 4px 8px !important; font-size: 12px !important; cursor: pointer !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
      .a11y-code-block button.copy-btn.copied { background: #16a34a !important; }
      .a11y-code-block pre { white-space: pre-line !important; line-height: 17px !important; word-break: break-all !important; font-family: "Courier New", monospace !important; font-size: 14px !important; color: #f3f4f6 !important; margin: 0 !important; }
      .a11y-empty-state { text-align: center !important; padding: 32px !important; color: #6b7280 !important; font-size: 14px !important; font-family: -apple-system, BlinkMacSystemFont, "Segue UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; line-height: 1.6 !important; }
      .a11y-detail-section ul.resources-links { padding: 0 !important; }
      .a11y-detail-section .resources-links li { word-break: break-all !important; font-size: 14px !important; font-family: -apple-system, BlinkMacSystemFont, "Segue UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; color: #374151 !important; line-height: 1.6 !important; margin-bottom: 8px !important; }
      .a11y-detail-section .resources-links a { color: #3b82f6 !important; text-decoration: underline !important; }
    `;
    const styleElement = document.createElement("style");
    styleElement.id = "a11y-panel-styles";
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  _createPanel() {
    this.panelElement = document.createElement("aside");
    this.panelElement.id = "a11y-live-panel";
    this.panelElement.setAttribute("role", "dialog");
    this.panelElement.setAttribute("aria-labelledby", "a11y-panel-title");
    this.panelElement.setAttribute("aria-modal", "true");
    this.panelElement.setAttribute("hidden", "true");
    this.panelElement.innerHTML = `
      <header class="a11y-panel-header">
        <h1 id="a11y-panel-title">Accessibility Issues</h1>
        <div class="a11y-panel-controls">
          <button id="a11y-help-btn" aria-label="Open Tutorial">?</button>
          <button id="a11y-close-btn" aria-label="Close Panel">X</button>
        </div>
      </header>
      <main class="a11y-panel-main">
        <section class="a11y-sidebar">
          <div class="a11y-toolbar">
          <label for="a11y-search">Search</label>
            <input type="search" id="a11y-search" class="a11y-search-input" placeholder="Search issues...">
            <div class="a11y-filter-group">
              <button class="a11y-filter-button active" data-filter="all">All</button>
              <button class="a11y-filter-button" data-filter="error">Errors</button>
              <button class="a11y-filter-button" data-filter="warning">Warnings</button>
              <button class="a11y-filter-button" data-filter="info">Info</button>
            </div>
          </div>
          <ul class="a11y-results-list"></ul>
        </section>
        <section class="a11y-detail-view hidden" aria-live="polite"></section>
      </main>
    `;
    document.body.appendChild(this.panelElement);
  }

  _setupEventListeners() {
    this.panelElement
      .querySelector("#a11y-close-btn")
      .addEventListener("click", () => this.hide());
    this.panelElement
      .querySelector("#a11y-help-btn")
      .addEventListener("click", () => this.uiManager.showTutorial());

    this.panelElement
      .querySelector("#a11y-search")
      .addEventListener("input", (e) => {
        this.activeFilters.search = e.target.value.toLowerCase();
        this._render();
      });

    this.panelElement.querySelectorAll(".a11y-filter-button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter;
        this.panelElement
          .querySelector(".a11y-filter-button.active")
          .classList.remove("active");
        btn.classList.add("active");
        this.activeFilters.severity = filter === "all" ? [] : [filter];
        this._render();
      });
    });
  }

  updateResults(results) {
    this.currentResults = results;
    // If a violation was selected, find its new version in the updated results
    if (this.selectedViolation) {
      this.selectedViolation =
        this.currentResults.find(
          (r) =>
            r.selector === this.selectedViolation.selector &&
            r.ruleId === this.selectedViolation.ruleId
        ) || null;
    }
    this._render();
  }

  _render() {
    const filtered = this.currentResults.filter((r) => {
      const searchMatch = this.activeFilters.search
        ? r.name.toLowerCase().includes(this.activeFilters.search) ||
          r.message.toLowerCase().includes(this.activeFilters.search)
        : true;
      const severityMatch =
        this.activeFilters.severity.length > 0
          ? this.activeFilters.severity.includes(r.severity)
          : true;
      return searchMatch && severityMatch;
    });

    this._renderList(filtered);
    this._renderDetail();
  }

  _renderList(results) {
    const listEl = this.panelElement.querySelector(".a11y-results-list");
    if (results.length === 0) {
      listEl.innerHTML = `<li class="a11y-empty-state">No issues found.</li>`;
      return;
    }

    listEl.innerHTML = results
      .map(
        (r) => `
      <li class="a11y-violation-item ${
        this.selectedViolation &&
        r.selector === this.selectedViolation.selector &&
        r.ruleId === this.selectedViolation.ruleId
          ? "selected"
          : ""
      }" data-selector="${r.selector}" data-rule="${r.ruleId}">
        <div class="a11y-violation-title">${r.name}</div>
        <div class="a11y-violation-meta">${r.selector}</div>
      </li>
    `
      )
      .join("");

    listEl.querySelectorAll(".a11y-violation-item").forEach((item) => {
      item.addEventListener("click", () => {
        this.selectedViolation = results.find(
          (r) =>
            r.selector === item.dataset.selector &&
            r.ruleId === item.dataset.rule
        );
        this.uiManager.highlightElement(this.selectedViolation);
        this._render();
      });
    });

    // Scroll the selected item into view
    const selectedItem = listEl.querySelector(".a11y-violation-item.selected");
    if (selectedItem) {
      selectedItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  _renderDetail() {
    const detailEl = this.panelElement.querySelector(".a11y-detail-view");
    const sidebarEl = this.panelElement.querySelector(".a11y-sidebar");

    if (!this.selectedViolation) {
      detailEl.classList.add("hidden");
      sidebarEl.style.width = "100%";
      this.uiManager.clearHighlight();
      return;
    }

    const v = this.selectedViolation;
    detailEl.classList.remove("hidden");
    sidebarEl.style.width = "50%";

    // Safe defaults
    const fixSuggestionsHTML = (v.fixSuggestions ?? [])
      .map(
        (s) => `
        <p>${s.action ?? "Fix"}:</p>
        <div class="a11y-code-block" data-code-block>
          <button class="copy-btn" aria-label="Copy code">Copy</button>
          <pre>${this._escapeHtml(s.code ?? "")}</pre>
        </div>
      `
      )
      .join("");

    const resourcesHTML = (v.learnMore?.additionalResources ?? [])
      .map(
        (url) => `
        <li><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></li>
      `
      )
      .join("");

    const wcagTag = v.learnMore?.wcagLink
      ? `<a href="${
          v.learnMore.wcagLink
        }" target="_blank" rel="noopener noreferrer" class="a11y-tag a11y-tag-wcag">WCAG ${
          v.wcag ?? ""
        }</a>`
      : "";

    detailEl.innerHTML = `
    <div class="a11y-detail-header">
        <h2 class="a11y-detail-title">${v.name ?? "Unknown Issue"}</h2>
        <span class="a11y-tag a11y-tag-${v.severity ?? "warning"}">${
      v.severity ?? "N/A"
    }</span>
        ${wcagTag}
    </div>
    <div class="a11y-detail-section">
        <h3>Description</h3>
        <p>${v.description ?? "No description provided."}</p>
    </div>
    <div class="a11y-detail-section">
        <h3>Element</h3>
        <div class="a11y-code-block" data-code-block>
          <button class="copy-btn" aria-label="Copy code">Copy</button>
          <pre>${this._escapeHtml(v.selector ?? "N/A")}</pre>
        </div>
    </div>
    <div class="a11y-detail-section">
        <h3>User Impact</h3>
        <p>${v.userImpact ?? "Not specified."}</p>
    </div>
    <div class="a11y-detail-section">
        <h3>How to Fix</h3>
        ${fixSuggestionsHTML || "<p>No fix suggestions available.</p>"}
    </div>
    <div class="a11y-detail-section">
        <h3>Learn More</h3>
        <p>${v.learnMore?.explanation ?? "No further information."}</p>
        <ul class="resources-links">${resourcesHTML}</ul>
    </div>
  `;

    this._setupCopyButtons(detailEl);
  }

  _setupCopyButtons(container) {
    container.querySelectorAll(".a11y-code-block").forEach((block) => {
      const button = block.querySelector(".copy-btn");
      const code = block.querySelector("pre")?.textContent ?? "";
      if (!button) return;

      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = "Copied";
          button.classList.add("copied");
          setTimeout(() => {
            button.textContent = "Copy";
            button.classList.remove("copied");
          }, 1500);
        } catch (err) {
          console.error("Failed to copy code", err);
        }
      });
    });
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  show() {
    this._isVisible = true;
    this.panelElement.removeAttribute("hidden");
    setTimeout(() => this.panelElement.classList.add("visible"), 10);
    this.uiManager.focusTrap.activate(this.panelElement);
  }

  hide() {
    this._isVisible = false;
    this.panelElement.classList.remove("visible");
    setTimeout(() => this.panelElement.setAttribute("hidden", "true"), 300);
    this.uiManager.focusTrap.deactivate();
    this.uiManager.clearHighlight();
  }

  isVisible() {
    return this._isVisible;
  }

  cleanup() {
    if (this.panelElement) this.panelElement.remove();
    const styles = document.getElementById("a11y-panel-styles");
    if (styles) styles.remove();
  }
}
