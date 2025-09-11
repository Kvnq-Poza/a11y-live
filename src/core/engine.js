/**
 * A11y Live - Real-time Accessibility Testing Tool
 * Core Engine Module
 *
 * This is the main engine that coordinates real-time accessibility analysis
 * using MutationObserver to monitor DOM changes and execute accessibility rules.
 */

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

    // Initialize core components
    this._ruleEngine = new RuleEngine();
    this._reporter = new Reporter();
    this._uiManager = this.options.enableUI ? new UIManager(this) : null;

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
   * Start the accessibility monitoring engine
   * @param {Object} overrideOptions - Options to override defaults
   */
  async start(overrideOptions = {}) {
    if (this._isStarted) {
      if (this._uiManager && this._uiManager.isClosed()) {
        this._uiManager.showPanel();
        console.log("📂 A11y Live panel reopened");
      } else {
        console.warn("A11y Live is already started");
      }
      return;
    }

    try {
      // Merge any override options
      Object.assign(this.options, overrideOptions);

      // Validate browser support
      if (!this._checkBrowserSupport()) {
        throw new Error("Browser does not support required APIs");
      }

      // Initialize target element
      this.options.target = this.options.target || document.body;

      // Set up MutationObserver
      this._setupMutationObserver();

      // Initialize UI if enabled
      if (this._uiManager) {
        await this._uiManager.initialize();
      }

      // Perform initial analysis of existing DOM
      await this._performInitialAnalysis();

      this._isStarted = true;

      // Emit started event
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

      // Clean up UI
      if (this._uiManager) {
        this._uiManager._closePanel();
      }

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
   * @param {NodeList|Array<Element>} elements - Elements to analyze
   * @returns {Promise<Array<AnalysisResult>>}
   */
  async analyze(elements) {
    const startTime = performance.now();

    try {
      // Convert NodeList to Array if needed
      const elementsArray = Array.from(elements || []);

      // Filter out non-element nodes and duplicates
      const validElements = elementsArray.filter(
        (el) => el && el.nodeType === Node.ELEMENT_NODE
      );

      if (validElements.length === 0) {
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
        console.log(processedResults);
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

        // Re-analyze visible elements
        if (this._isStarted) {
          this._performInitialAnalysis();
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

    this._isAnalyzing = true;

    try {
      // Dequeue all pending mutations
      const batch = this._analysisQueue.splice(0);

      // Flatten and deduplicate elements
      const allElements = new Set();
      batch.forEach((item) => {
        item.elements.forEach((el) => allElements.add(el));
      });

      // Limit batch size for performance
      const elementsToAnalyze = Array.from(allElements).slice(
        0,
        this.options.maxElements
      );

      if (elementsToAnalyze.length > 0) {
        await this.analyze(elementsToAnalyze);
      }
    } catch (error) {
      console.error("Batch processing failed:", error);
    } finally {
      this._isAnalyzing = false;
    }
  }

  /**
   * Perform initial analysis of existing DOM
   */
  async _performInitialAnalysis() {
    try {
      const allElements = this.options.target.querySelectorAll("*");
      const elementsArray = Array.from(allElements).slice(
        0,
        this.options.maxElements
      );

      if (elementsArray.length > 0) {
        const results = await this.analyze(elementsArray);

        // Ensure UI gets the results
        if (this._uiManager && results.length > 0) {
          this._uiManager.updateResults(results);
          console.log(results);
        }
      }
    } catch (error) {
      console.error("Initial analysis failed:", error);
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
