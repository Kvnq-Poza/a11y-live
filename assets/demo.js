class DemoApp {
  constructor() {
    this.engine = null;
    this.isRunning = false;
    this.stats = {
      errors: 0,
      warnings: 0,
      total: 0,
      elements: 0,
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateUI();
  }

  setupEventListeners() {
    document
      .getElementById("start-btn")
      .addEventListener("click", () => this.startTesting());
    document
      .getElementById("stop-btn")
      .addEventListener("click", () => this.stopTesting());
    document
      .getElementById("tutorial-btn")
      .addEventListener("click", () => this.startTutorial());
    document
      .getElementById("analyze-examples")
      .addEventListener("click", () => this.analyzeExamples());

    // Listen for A11y Live events
    window.addEventListener("a11y-live-started", (e) => {
      this.isRunning = true;
      this.updateUI();
    });

    window.addEventListener("a11y-live-stopped", (e) => {
      this.isRunning = false;
      this.updateUI();
    });
  }

  async startTesting() {
    try {
      if (!this.engine) {
        this.engine = new A11yEngine({
          enableUI: true,
          realtime: true,
          debounceMs: 300,
        });
      }

      this.setStatus("Starting...", true);
      await this.engine.start();
      this.setStatus("Active", true);
      this.updateStats();
    } catch (error) {
      console.error("Failed to start A11y Live:", error);
      this.setStatus("Error", false);
    }
  }

  stopTesting() {
    if (this.engine) {
      this.engine.stop();
      this.setStatus("Stopped", false);
    }
  }

  startTutorial() {
    if (!this.engine) {
      // Start engine first, then tutorial
      this.startTesting().then(() => {
        setTimeout(() => {
          if (this.engine._uiManager && this.engine._uiManager.tutorial) {
            this.engine._uiManager.tutorial.show();
          }
        }, 1000);
      });
    } else if (this.engine._uiManager && this.engine._uiManager.tutorial) {
      this.engine._uiManager.tutorial.show();
    }
  }

  async analyzeExamples() {
    if (!this.engine) {
      await this.startTesting();
      // Wait a moment for UI to initialize
      setTimeout(() => this.analyzeExamples(), 1000);
      return;
    }

    const examples = document.querySelector(".test-examples");
    if (examples) {
      const results = await this.engine.analyze(examples);
      this.highlightProblematicCards(results);
      this.updateStats();

      if (this.engine._uiManager) {
        this.engine._uiManager.showPanel();
      }
    }
  }

  highlightProblematicCards(results) {
    // Reset all cards
    document.querySelectorAll(".test-card").forEach((card) => {
      card.classList.remove("has-issues");
    });

    // Highlight cards with issues
    results.forEach((result) => {
      const element = document.querySelector(result.selector);
      if (element) {
        const card = element.closest(".test-card");
        if (card) {
          card.classList.add("has-issues");
        }
      }
    });
  }

  updateStats() {
    if (this.engine && this.engine._reporter) {
      const summary = this.engine._reporter.getSummary();
      this.stats = {
        errors: summary.errors,
        warnings: summary.warnings,
        total: summary.total,
        elements: this.engine.getStats().elementsProcessed,
      };
    }

    document.getElementById("error-count").textContent = this.stats.errors;
    document.getElementById("warning-count").textContent = this.stats.warnings;
    document.getElementById("total-count").textContent = this.stats.total;
    document.getElementById("elements-count").textContent = this.stats.elements;
  }

  setStatus(text, active = false) {
    const status = document.getElementById("status");
    const statusText = status.querySelector("span");

    statusText.textContent = text;

    if (active) {
      status.classList.add("active");
    } else {
      status.classList.remove("active");
    }
  }

  updateUI() {
    const startBtn = document.getElementById("start-btn");
    const stopBtn = document.getElementById("stop-btn");

    if (this.isRunning) {
      startBtn.style.display = "none";
      stopBtn.style.display = "inline-flex";
    } else {
      startBtn.style.display = "inline-flex";
      stopBtn.style.display = "none";
    }
  }
}

// Initialize the demo when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.demoApp = new DemoApp();
});

// Update stats periodically
setInterval(() => {
  if (window.demoApp) {
    window.demoApp.updateStats();
  }
}, 2000);
