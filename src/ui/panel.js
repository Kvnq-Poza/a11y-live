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
      .a11y-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
      #a11y-live-panel { display:flex; flex-direction:column; position:fixed; right:1rem; bottom:1rem; width:450px; max-width:90vw; height:600px; max-height:70vh; background-color:#fff; border-radius:0.75rem; box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -2px rgba(0,0,0,.05); border:1px solid #e5e7eb; z-index:2147483647; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; color:#1f2937; transform:translateY(2rem); opacity:0; visibility:hidden; transition:transform .3s ease,opacity .3s ease,visibility 0s linear .3s; }
      #a11y-live-panel.visible { transform:translateY(0); opacity:1; visibility:visible; transition:transform .3s ease,opacity .3s ease,visibility 0s; }
      .a11y-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; border-radius: 0.75rem 0.75rem 0 0; }
      .a11y-panel-header h2 { font-size: 1.125rem; font-weight: 600; margin: 0; }
      .a11y-panel-controls button { background: none; border: 1px solid transparent; border-radius: 0.375rem; padding: 0.5rem; cursor: pointer; color: #6b7280; transition: background-color .2s; }
      .a11y-panel-controls button:hover { background-color: #f3f4f6; color: #1f2937; }
      .a11y-panel-main { display: flex; flex: 1; overflow: hidden; }
      .a11y-sidebar { width: 100%; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; transition: width .3s ease; }
      .a11y-sidebar.collapsed { width: 0; }
      .a11y-toolbar { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; }
      .a11y-search-input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }
      .a11y-filter-group { display: flex; justify-content: space-around; margin-top: 0.5rem; }
      .a11y-filter-button { flex: 1; background-color: #fff; border: 1px solid #d1d5db; padding: 0.375rem 0; font-size: 0.75rem; cursor: pointer; transition: background-color .2s; }
      .a11y-filter-button:first-child { border-radius: 0.375rem 0 0 0.375rem; }
      .a11y-filter-button:last-child { border-radius: 0 0.375rem 0.375rem 0; border-left: 0; }
      .a11y-filter-button.active { background-color: #e5e7eb; font-weight: 600; }
      .a11y-results-list { list-style: none; padding: 0; margin: 0; flex: 1; overflow-y: auto; }
      .a11y-violation-item { padding: 1rem; border-bottom: 1px solid #f3f4f6; cursor: pointer; }
      .a11y-violation-item:hover { background-color: #f9fafb; }
      .a11y-violation-item.selected { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding-left: calc(1rem - 4px); }
      .a11y-violation-title { font-weight: 600; margin-bottom: 0.25rem; }
      .a11y-violation-meta { font-size: 0.75rem; color: #6b7280; }
      .a11y-detail-view { flex: 1; padding: 1.5rem; overflow-y: auto; background-color: #f9fafb; }
      .a11y-detail-view.hidden { display: none; }
      .a11y-detail-header { border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1rem; }
      .a11y-detail-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
      .a11y-tag { display: inline-block; padding: 0.25rem 0.625rem; font-size: 0.75rem; font-weight: 500; border-radius: 9999px; margin-right: 0.5rem; }
      .a11y-tag-error { background-color: #fee2e2; color: #991b1b; }
      .a11y-tag-warning { background-color: #fef3c7; color: #92400e; }
      .a11y-tag-wcag { background-color: #dbeafe; color: #1e40af; }
      .a11y-detail-section { margin-bottom: 1.5rem; }
      .a11y-detail-section h3 { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; color: #6b7280; margin-bottom: 0.75rem; }
      .a11y-detail-section p, .a11y-detail-section ul { font-size: 0.875rem; line-height: 1.5; color: #374151; }
      .a11y-code-block { background-color: #1f2937; color: #f3f4f6; padding: 1rem; border-radius: 0.5rem; font-family: "Courier New", monospace; font-size: 0.875rem; white-space: pre-wrap; word-break: break-all; }
      .a11y-empty-state { text-align: center; padding: 2rem; color: #6b7280; }
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
        <h2 id="a11y-panel-title">Accessibility Issues</h2>
        <div class="a11y-panel-controls">
          <button id="a11y-help-btn" aria-label="Open Tutorial">?</button>
          <button id="a11y-close-btn" aria-label="Close Panel">X</button>
        </div>
      </header>
      <main class="a11y-panel-main">
        <section class="a11y-sidebar">
          <div class="a11y-toolbar">
            <input type="search" id="a11y-search" class="a11y-search-input" placeholder="Search issues...">
            <div class="a11y-filter-group">
              <button class="a11y-filter-button active" data-filter="all">All</button>
              <button class="a11y-filter-button" data-filter="error">Errors</button>
              <button class="a11y-filter-button" data-filter="warning">Warnings</button>
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
        this.selectedViolation === r ? "selected" : ""
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

    const fixSuggestionsHTML = v.fixSuggestions
      .map(
        (s) => `
        <p>${s.action}:</p>
        <div class="a11y-code-block">${this._escapeHtml(s.code)}</div>
    `
      )
      .join("");

    const resourcesHTML = v.learnMore.additionalResources
      .map(
        (url) => `
        <li><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></li>
    `
      )
      .join("");

    detailEl.innerHTML = `
        <div class="a11y-detail-header">
            <h2 class="a11y-detail-title">${v.name}</h2>
            <span class="a11y-tag a11y-tag-${v.severity}">${v.severity}</span>
            <a href="${
              v.learnMore.wcagLink
            }" target="_blank" rel="noopener noreferrer" class="a11y-tag a11y-tag-wcag">WCAG ${
      v.wcag
    }</a>
        </div>
        <div class="a11y-detail-section">
            <h3>Description</h3>
            <p>${v.description}</p>
        </div>
        <div class="a11y-detail-section">
            <h3>Element</h3>
            <div class="a11y-code-block">${this._escapeHtml(v.selector)}</div>
        </div>
        <div class="a11y-detail-section">
            <h3>User Impact</h3>
            <p>${v.userImpact}</p>
        </div>
        <div class="a11y-detail-section">
            <h3>How to Fix</h3>
            ${fixSuggestionsHTML}
        </div>
        <div class="a11y-detail-section">
            <h3>Learn More</h3>
            <p>${v.learnMore.explanation}</p>
            <ul>${resourcesHTML}</ul>
        </div>
    `;
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
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
