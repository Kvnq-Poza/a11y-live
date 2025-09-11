/**
 * A11y Live - Real-time Accessibility Testing Tool
 * Core Engine Module
 *
 * This is the main engine that coordinates real-time accessibility analysis
 * using MutationObserver to monitor DOM changes and execute accessibility rules.
 */

// Utility: dynamically load scripts
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-a11y="${src}"]`)) {
      return resolve(); // already loaded
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.defer = false;
    script.dataset.a11y = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Ensure dependencies are loaded before defining the engine
async function loadDependencies() {
  // Core scripts (must come first)
  await loadScript("./src/core/rules.js");
  await loadScript("./src/core/reporter.js");

  // UI scripts (only if UI enabled)
  await loadScript("./src/ui/overlay.js");
  await loadScript("./src/ui/panel.js");
  await loadScript("./src/ui/tutorial.js");
  await loadScript("./src/ui/ui-Manager.js");
}

class A11yEngine {
  constructor(options = {}) {
    // Merge options with defaults
    this.options = {
      mode: "development",
      realtime: true,
      rules: [],
      target: null,
      debounceMs: 100,
      maxElements: 50,
      enableUI: true,
      ...options,
    };

    // Private properties
    this._observer = null;
    this._analysisQueue = [];
    this._debounceTimer = null;
    this._isAnalyzing = false;
    this._cache = new Map();
    this._isStarted = false;

    // Components are initialized after scripts are loaded
    this._ruleEngine = null;
    this._reporter = null;
    this._uiManager = null;

    // Performance monitoring
    this._stats = {
      analysisCount: 0,
      totalAnalysisTime: 0,
      violationsFound: 0,
      elementsProcessed: 0,
    };

    // Bind methods to preserve context
    this._handleMutations = this._handleMutations.bind(this);
    this._processBatch = this._processBatch.bind(this);
  }

  /**
   * Initialize engine dependencies and components
   */
  async _initializeDependencies() {
    await loadDependencies();

    // Now that scripts are loaded, these classes exist globally
    this._ruleEngine = new RuleEngine();
    this._reporter = new Reporter();
    this._uiManager = this.options.enableUI ? new UIManager(this) : null;
  }

  /**
   * Start the accessibility monitoring engine
   * @param {Object} overrideOptions - Options to override defaults
   */
  async start(overrideOptions = {}) {
    if (this._isStarted) {
      if (this._uiManager) {
        this._uiManager.showPanel();
        console.log("📂 A11y Live panel reopened");
      } else {
        console.warn("A11y Live is already started");
      }
      return;
    }

    try {
      Object.assign(this.options, overrideOptions);

      if (!this._checkBrowserSupport()) {
        throw new Error("Browser does not support required APIs");
      }

      // Load dependencies dynamically
      if (!this._ruleEngine || !this._reporter) {
        await this._initializeDependencies();
      }

      this.options.target = this.options.target || document.body;
      this._setupMutationObserver();

      if (this._uiManager) {
        await this._uiManager.initialize();
      }

      await this._analyzeCurrentPage();
      this._isStarted = true;

      this._emitEvent("started", {
        target: this.options.target,
        rulesEnabled: this._ruleEngine.getEnabledRules().length,
        mode: this.options.mode,
      });

      console.log("🎯 A11y Live started successfully");
    } catch (error) {
      console.error("Failed to start A11y Live:", error);
      throw error;
    }
  }

  /**
   * Stop the accessibility monitoring engine
   */
  stop() {
    if (!this._isStarted) {
      console.warn("A11y Live is not currently running");
      return;
    }

    try {
      // Disconnect observer
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }

      // Clear timers and queues
      if (this._debounceTimer) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = null;
      }
      this._analysisQueue = [];

      // Clear caches
      this._cache.clear();

      this._isStarted = false;

      // Emit stopped event
      this._emitEvent("stopped", { stats: this._stats });

      console.log("🛑 A11y Live stopped");
    } catch (error) {
      console.error("Error stopping A11y Live:", error);
    }
  }

  /**
   * Analyze specific elements for accessibility violations
   * @param {Element|NodeList|Array<Element>} elements - Elements to analyze
   * @returns {Promise<Array<AnalysisResult>>}
   */
  async analyze(elements) {
    const startTime = performance.now();

    try {
      // Handle different input types
      let elementsArray = [];

      if (!elements) {
        console.warn("No elements provided for analysis");
        return [];
      }

      // Handle single Element
      if (elements instanceof Element) {
        elementsArray = [elements];
        // Also analyze all children
        const children = elements.querySelectorAll("*");
        elementsArray.push(...Array.from(children));
      }
      // Handle NodeList or HTMLCollection
      else if (
        elements instanceof NodeList ||
        elements instanceof HTMLCollection
      ) {
        elementsArray = Array.from(elements);
        // For each element, also include its children
        const allElements = [];
        elementsArray.forEach((el) => {
          allElements.push(el);
          const children = el.querySelectorAll("*");
          allElements.push(...Array.from(children));
        });
        elementsArray = allElements;
      }
      // Handle Array
      else if (Array.isArray(elements)) {
        const allElements = [];
        elements.forEach((el) => {
          if (el instanceof Element) {
            allElements.push(el);
            const children = el.querySelectorAll("*");
            allElements.push(...Array.from(children));
          }
        });
        elementsArray = allElements;
      }
      // Handle querySelector result that's null
      else {
        console.warn("Invalid element type provided:", typeof elements);
        return [];
      }

      // Filter out non-element nodes and remove duplicates
      const uniqueElements = new Map();
      elementsArray.forEach((el) => {
        if (el && el.nodeType === Node.ELEMENT_NODE) {
          uniqueElements.set(el, el);
        }
      });

      const validElements = Array.from(uniqueElements.values());

      if (validElements.length === 0) {
        console.log("No valid elements to analyze");
        return [];
      }

      // Check cache for previously analyzed elements
      const uncachedElements = [];
      const cachedResults = [];

      for (const element of validElements) {
        const cacheKey = this._getCacheKey(element);
        if (this._cache.has(cacheKey)) {
          cachedResults.push(this._cache.get(cacheKey));
        } else {
          uncachedElements.push(element);
        }
      }

      // Analyze uncached elements
      let newResults = [];
      if (uncachedElements.length > 0) {
        newResults = await this._ruleEngine.executeRules(uncachedElements);

        // Update cache with new results
        newResults.forEach((result) => {
          const cacheKey = this._getCacheKey(result.element);
          this._cache.set(cacheKey, result);
        });
      }

      // Combine cached and new results
      const allResults = [...cachedResults, ...newResults];

      // Update stats
      const analysisTime = performance.now() - startTime;
      this._updateStats(validElements.length, analysisTime, allResults.length);

      // Process results through reporter
      const processedResults = this._reporter.processResults(allResults);

      // Update UI only if there are results
      if (this._uiManager && processedResults.length > 0) {
        this._uiManager.updateResults(processedResults);
        console.log(
          `Found ${processedResults.length} issues in analyzed element(s)`
        );
      }

      return processedResults;
    } catch (error) {
      console.error("Analysis failed:", error);
      return [];
    }
  }

  /**
   * Update configuration without restarting
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    try {
      const oldConfig = { ...this.options };
      Object.assign(this.options, newConfig);

      // Update rule engine if rules changed
      if (
        newConfig.rules &&
        JSON.stringify(newConfig.rules) !== JSON.stringify(oldConfig.rules)
      ) {
        this._ruleEngine.updateEnabledRules(newConfig.rules);
        this._cache.clear(); // Clear cache since rules changed

        // Re-analyze current page if engine is running
        if (this._isStarted) {
          this._analyzeCurrentPage();
        }
      }

      // Update UI if needed
      if (this._uiManager && newConfig.enableUI !== undefined) {
        if (newConfig.enableUI && !oldConfig.enableUI) {
          this._uiManager.initialize();
        } else if (!newConfig.enableUI && oldConfig.enableUI) {
          this._uiManager.cleanup();
        }
      }

      this._emitEvent("configUpdated", { oldConfig, newConfig });
    } catch (error) {
      console.error("Failed to update config:", error);
    }
  }

  /**
   * Get current statistics
   * @returns {Object} Performance and usage statistics
   */
  getStats() {
    return {
      ...this._stats,
      averageAnalysisTime:
        this._stats.analysisCount > 0
          ? this._stats.totalAnalysisTime / this._stats.analysisCount
          : 0,
      cacheSize: this._cache.size,
      isRunning: this._isStarted,
    };
  }

  // Private Methods

  /**
   * Check if browser supports required APIs
   * @returns {boolean}
   */
  _checkBrowserSupport() {
    return !!(
      window.MutationObserver &&
      window.IntersectionObserver &&
      window.getComputedStyle &&
      document.querySelector
    );
  }

  /**
   * Set up MutationObserver with optimized configuration
   */
  _setupMutationObserver() {
    if (!this.options.realtime) {
      return;
    }

    this._observer = new MutationObserver(this._handleMutations);

    // Optimized observer configuration
    const config = {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        // Only watch accessibility-relevant attributes
        "alt",
        "aria-label",
        "aria-labelledby",
        "aria-describedby",
        "aria-hidden",
        "aria-expanded",
        "aria-selected",
        "aria-checked",
        "role",
        "tabindex",
        "title",
        "for",
        "id",
        "class",
        "style",
      ],
    };

    this._observer.observe(this.options.target, config);
  }

  /**
   * Handle mutation events from MutationObserver
   * @param {Array<MutationRecord>} mutations - Array of mutations
   */
  _handleMutations(mutations) {
    if (!this._isStarted || this._isAnalyzing) {
      return;
    }

    // Extract affected elements
    const affectedElements = new Set();

    mutations.forEach((mutation) => {
      // Add target element
      if (mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE) {
        affectedElements.add(mutation.target);
      }

      // Add added nodes
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          affectedElements.add(node);
          // Also add child elements
          const childElements = node.querySelectorAll("*");
          childElements.forEach((child) => affectedElements.add(child));
        }
      });
    });

    // Add to analysis queue with timestamp
    if (affectedElements.size > 0) {
      this._analysisQueue.push({
        elements: Array.from(affectedElements),
        timestamp: Date.now(),
      });

      // Debounce batch processing
      if (this._debounceTimer) {
        clearTimeout(this._debounceTimer);
      }

      this._debounceTimer = setTimeout(
        this._processBatch,
        this.options.debounceMs
      );
    }
  }

  /**
   * Process batched mutations
   */
  async _processBatch() {
    if (this._isAnalyzing || this._analysisQueue.length === 0) {
      return;
    }

    // Throttle analysis to prevent excessive processing
    const now = Date.now();
    if (now - this._lastAnalysisTime < this._analysisThrottleMs) {
      // Schedule for later
      this._debounceTimer = setTimeout(
        this._processBatch,
        this._analysisThrottleMs
      );
      return;
    }

    this._isAnalyzing = true;
    this._lastAnalysisTime = now;

    try {
      // Dequeue all pending mutations
      const batch = this._analysisQueue.splice(0);

      // Flatten and deduplicate elements
      const allElements = new Set();

      // Limit batch size for performance
      const elementsToAnalyze = Array.from(allElements).slice(
        0,
        this.options.maxElements
      );

      if (elementsToAnalyze.length > 0) {
        // Use requestAnimationFrame for better performance
        await new Promise((resolve) => {
          requestAnimationFrame(async () => {
            await this.analyze(elementsToAnalyze);
            resolve();
          });
        });
      }
    } catch (error) {
      console.error("Batch processing failed:", error);
    } finally {
      this._isAnalyzing = false;
    }
  }

  /**
   * Analyze current page content (replaces _performInitialAnalysis)
   * This method specifically inspects document.body.querySelectorAll("*")
   */
  async _analyzeCurrentPage() {
    try {
      // Get all elements from document.body
      const allElements = document.body.querySelectorAll("*");
      const elementsArray = Array.from(allElements).slice(
        0,
        this.options.maxElements
      );

      console.log(
        `🔍 Analyzing ${elementsArray.length} elements from current page`
      );

      if (elementsArray.length > 0) {
        // Pass document.body to analyze method to include body itself
        const results = await this.analyze(document.body);

        // Ensure UI gets the results
        if (this._uiManager && results.length > 0) {
          this._uiManager.updateResults(results);
          console.log(`📊 Found ${results.length} accessibility issues`);
        } else if (results.length === 0) {
          console.log("✅ No accessibility issues found on current page");
        }

        return results;
      }
    } catch (error) {
      console.error("Current page analysis failed:", error);
      return [];
    }
  }

  /**
   * Generate cache key for element
   * @param {Element} element - DOM element
   * @returns {string} Cache key
   */
  _getCacheKey(element) {
    // Create a key based on element characteristics
    const tagName = element.tagName;
    const id = element.id || "";
    const className = element.className || "";
    const outerHTML = element.outerHTML;

    // Simple hash of the element's HTML for cache key
    let hash = 0;
    for (let i = 0; i < outerHTML.length; i++) {
      const char = outerHTML.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return `${tagName}-${id}-${className}-${hash}`;
  }

  /**
   * Update performance statistics
   */
  _updateStats(elementsProcessed, analysisTime, violationsFound) {
    this._stats.analysisCount++;
    this._stats.totalAnalysisTime += analysisTime;
    this._stats.elementsProcessed += elementsProcessed;
    this._stats.violationsFound += violationsFound;
  }

  /**
   * Emit custom events
   */
  _emitEvent(eventName, detail) {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      const event = new CustomEvent(`a11y-live-${eventName}`, { detail });
      window.dispatchEvent(event);
    }
  }
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = A11yEngine;
} else if (typeof window !== "undefined") {
  window.A11yEngine = A11yEngine;
}
