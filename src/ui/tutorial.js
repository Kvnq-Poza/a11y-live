/**
 * A11y Live - Tutorial Component
 *
 * Provides an interactive, step-by-step guide to using the A11y Live tool.
 * It appears as a modal overlay and is fully keyboard-accessible.
 */
class Tutorial {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.tutorialEl = null;
    this.currentStep = 0;
    this.steps = [
      {
        title: "Welcome to A11y Live!",
        content:
          "This brief tour will guide you through the main features of the accessibility checker. Use the arrow keys or buttons to navigate.",
      },
      {
        title: "The Issues Panel",
        content:
          "This panel on your right lists all accessibility issues found on the page. It's the central hub for your review.",
      },
      {
        title: "Filtering and Searching",
        content:
          "You can filter issues by severity (Errors, Warnings) or use the search bar to find specific problems by name or description.",
      },
      {
        title: "Viewing Details",
        content:
          "Click on any issue in the list to see detailed information, including what the problem is, why it matters, and code suggestions on how to fix it.",
      },
      {
        title: "Element Highlighting",
        content:
          "When you select an issue, the corresponding element on the page will be highlighted, showing you exactly where the problem is located.",
      },
      {
        title: "You're all set!",
        content:
          "You can reopen this tutorial anytime by clicking the '?' button in the panel header. Happy testing!",
      },
    ];
  }

  initialize() {
    this._injectStyles();
    this._createTutorial();
  }

  _injectStyles() {
    if (document.getElementById("a11y-tutorial-styles")) return;
    const styles = `
            .a11y-tutorial-backdrop { position: fixed !important; inset: 0 !important; background-color: rgba(0,0,0,0.5) !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important; opacity: 0 !important; transition: opacity 0.3s ease !important; pointer-events: none !important; }
            .a11y-tutorial-backdrop.visible { opacity: 1 !important; pointer-events: auto !important; }
            .a11y-tutorial-modal { background: #fff !important; border-radius: 12px !important; width: 500px !important; max-width: 90vw !important; padding: 32px !important; box-shadow: 0 10px 15px -3px rgba(0,0,0,.1) !important; text-align: center !important; transform: scale(0.95) !important; transition: transform 0.3s ease !important; }
            .a11y-tutorial-backdrop.visible .a11y-tutorial-modal { transform: scale(1) !important; }
            .a11y-tutorial-modal h2 { font-size: 24px !important; font-weight: 600 !important; margin-top: 0 !important; margin-bottom: 16px !important; color: #1f2937 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; line-height: 1.4 !important; }
            .a11y-tutorial-modal p { font-size: 16px !important; line-height: 1.6 !important; color: #374151 !important; margin-bottom: 32px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
            .a11y-tutorial-nav { display: flex !important; justify-content: space-between !important; align-items: center !important; }
            .a11y-tutorial-dots { display: flex !important; gap: 8px !important; }
            .a11y-tutorial-dot { width: 10px !important; height: 10px !important; border-radius: 50% !important; background-color: #d1d5db !important; transition: background-color 0.2s !important; }
            .a11y-tutorial-dot.active { background-color: #3b82f6 !important; }
            .a11y-tutorial-btn { background: #3b82f6 !important; color: white !important; border: none !important; padding: 10px 20px !important; font-size: 14px !important; font-weight: 500 !important; border-radius: 6px !important; cursor: pointer !important; transition: background-color 0.2s !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; line-height: 1.4 !important; }
            .a11y-tutorial-btn:hover { background: #2563eb !important; }
            .a11y-tutorial-btn.secondary { background-color: #e5e7eb !important; color: #374151 !important; }
            .a11y-tutorial-btn.secondary:hover { background-color: #d1d5db !important; }
        `;
    const styleEl = document.createElement("style");
    styleEl.id = "a11y-tutorial-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  _createTutorial() {
    this.tutorialEl = document.createElement("div");
    this.tutorialEl.className = "a11y-tutorial-backdrop";
    this.tutorialEl.setAttribute("id", "a11y-tutorial-title");
    this.tutorialEl.setAttribute("role", "dialog");
    this.tutorialEl.setAttribute("aria-modal", "true");
    this.tutorialEl.setAttribute("aria-labelledby", "a11y-tutorial-title");
    this.tutorialEl.innerHTML = `<div class="a11y-tutorial-modal" role="document"></div>`;
    document.body.appendChild(this.tutorialEl);

    this.tutorialEl.addEventListener("click", (e) => {
      if (e.target === this.tutorialEl) this.hide();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.tutorialEl.classList.contains("visible")) {
        this.hide();
      }
    });
  }

  _renderStep() {
    const step = this.steps[this.currentStep];
    const modal = this.tutorialEl.querySelector(".a11y-tutorial-modal");

    const dotsHTML = this.steps
      .map(
        (_, i) =>
          `<div class="a11y-tutorial-dot ${
            i === this.currentStep ? "active" : ""
          }"></div>`
      )
      .join("");

    modal.innerHTML = `
            <h2 id="a11y-tutorial-title">${step.title}</h2>
            <p>${step.content}</p>
            <div class="a11y-tutorial-nav">
                ${
                  this.currentStep > 0
                    ? `<button class="a11y-tutorial-btn secondary" id="a11y-tutorial-prev">Previous</button>`
                    : `<div></div>`
                }
                <div class="a11y-tutorial-dots">${dotsHTML}</div>
                <button class="a11y-tutorial-btn" id="a11y-tutorial-next">${
                  this.currentStep === this.steps.length - 1 ? "Finish" : "Next"
                }</button>
            </div>
        `;

    const prevBtn = modal.querySelector("#a11y-tutorial-prev");
    const nextBtn = modal.querySelector("#a11y-tutorial-next");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.navigate(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (this.currentStep === this.steps.length - 1) {
          this.hide();
        } else {
          this.navigate(1);
        }
      });
    }

    this.uiManager.focusTrap.activate(modal);
  }

  navigate(direction) {
    const newStep = this.currentStep + direction;
    if (newStep >= 0 && newStep < this.steps.length) {
      this.currentStep = newStep;
      this._renderStep();
    }
  }

  show() {
    this.currentStep = 0;
    this._renderStep();
    this.tutorialEl.classList.add("visible");
  }

  hide() {
    this.uiManager.focusTrap.deactivate();
    this.tutorialEl.classList.remove("visible");
  }

  cleanup() {
    if (this.tutorialEl) this.tutorialEl.remove();
    const styles = document.getElementById("a11y-tutorial-styles");
    if (styles) styles.remove();
  }
}
