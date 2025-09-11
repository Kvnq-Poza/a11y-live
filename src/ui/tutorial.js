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
            .a11y-tutorial-backdrop { position: fixed; inset: 0; background-color: rgba(0,0,0,0.5); z-index: 2147483647; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
            .a11y-tutorial-backdrop.visible { opacity: 1; pointer-events: auto; }
            .a11y-tutorial-modal { background: #fff; border-radius: 0.75rem; width: 500px; max-width: 90vw; padding: 2rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,.1); text-align: center; transform: scale(0.95); transition: transform 0.3s ease; }
            .a11y-tutorial-backdrop.visible .a11y-tutorial-modal { transform: scale(1); }
            .a11y-tutorial-modal h2 { font-size: 1.5rem; font-weight: 600; margin-top: 0; margin-bottom: 1rem; color: #1f2937; }
            .a11y-tutorial-modal p { font-size: 1rem; line-height: 1.5; color: #374151; margin-bottom: 2rem; }
            .a11y-tutorial-nav { display: flex; justify-content: space-between; align-items: center; }
            .a11y-tutorial-dots { display: flex; gap: 0.5rem; }
            .a11y-tutorial-dot { width: 10px; height: 10px; border-radius: 50%; background-color: #d1d5db; transition: background-color 0.2s; }
            .a11y-tutorial-dot.active { background-color: #3b82f6; }
            .a11y-tutorial-btn { background: #3b82f6; color: white; border: none; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer; transition: background-color 0.2s; }
            .a11y-tutorial-btn:hover { background: #2563eb; }
            .a11y-tutorial-btn.secondary { background-color: #e5e7eb; color: #374151; }
            .a11y-tutorial-btn.secondary:hover { background-color: #d1d5db; }
        `;
    const styleEl = document.createElement("style");
    styleEl.id = "a11y-tutorial-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  _createTutorial() {
    this.tutorialEl = document.createElement("div");
    this.tutorialEl.className = "a11y-tutorial-backdrop";
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
