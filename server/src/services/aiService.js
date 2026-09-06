/**
 * aiService.js
 *
 * Isolated service interfacing with Google Gemini API using @google/genai SDK.
 * Evaluates deterministic inventory analysis from Phase 3 and produces structured
 * reorder recommendations (urgency, recommendedAction, reason, source).
 *
 * Architectural Boundary:
 * - Only this service communicates with Gemini.
 * - Does not modify database, send notifications, or control schedulers.
 * - Gracefully falls back to deterministic rules if Gemini is unavailable, disabled,
 *   or returns an invalid response.
 */

const { GoogleGenAI, Type } = require("@google/genai");
const { validateAIResponse } = require("../utils/aiResponseValidator");

const SYSTEM_PROMPT = `You are an inventory risk analysis assistant.

Your job is to evaluate inventory information that has already been calculated by a backend system.

Use only the information provided.

Do not invent missing information.

The backend has already calculated:
- sales velocity
- days until stockout
- deterministic inventory status

Use these values when making your recommendation.

Return ONLY valid JSON matching the required schema.

Allowed urgency values:
LOW, MEDIUM, HIGH, CRITICAL

Allowed recommendedAction values:
MONITOR, PLAN_REORDER, REORDER_SOON, REORDER_NOW

Keep the reason concise and based only on the supplied data.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    urgency: {
      type: Type.STRING,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    recommendedAction: {
      type: Type.STRING,
      enum: ["MONITOR", "PLAN_REORDER", "REORDER_SOON", "REORDER_NOW"],
    },
    reason: {
      type: Type.STRING,
    },
  },
  required: ["urgency", "recommendedAction", "reason"],
};

class AIService {
  constructor() {
    this._client = null;
    this._lastRequestTime = 0;
  }

  /**
   * Enforces pacing delay between outgoing Google Gemini API calls.
   * Protects against burst rate limit errors (e.g. 429 RESOURCE_EXHAUSTED / 503 UNAVAILABLE).
   *
   * @param {string} [productName="item"] - Product name for log context
   */
  async _enforceRequestRateLimit(productName = "item") {
    const rawDelay = process.env.GEMINI_REQUEST_DELAY_MS;
    const minDelay =
      rawDelay !== undefined && !isNaN(Number(rawDelay))
        ? Number(rawDelay)
        : 1500;

    if (minDelay <= 0) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this._lastRequestTime;
    if (this._lastRequestTime > 0 && elapsed < minDelay) {
      const waitMs = minDelay - elapsed;
      console.log(
        `[AI] Pacing Gemini request for ${productName}: waiting ${waitMs}ms to respect rate limit...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  /**
   * Lazy-initializes or returns the Google Gen AI client.
   * Keeps credentials purely within environment variables.
   */
  _getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    if (!this._client) {
      this._client = new GoogleGenAI({ apiKey });
    }
    return this._client;
  }

  /**
   * Deterministic fallback when Gemini is disabled, missing API key, or fails.
   *
   * Rules (Phase 4 Specification):
   * 1. IF daysUntilStockout <= 2 -> CRITICAL, REORDER_NOW
   * 2. ELSE IF daysUntilStockout <= 7 -> HIGH, REORDER_SOON
   * 3. ELSE IF status = LOW_STOCK -> MEDIUM, PLAN_REORDER
   * 4. ELSE -> LOW, MONITOR
   *
   * @param {Object} analysis - Phase 3 deterministic analysis object
   * @param {string} [fallbackReason] - Optional reason suffix
   * @returns {Object} Structured decision with source: 'fallback'
   */
  calculateFallback(analysis = {}, fallbackReason = null) {
    const stockoutDays = analysis.daysUntilStockout;
    const status = analysis.status;
    const name = analysis.name || "item";

    let urgency = "LOW";
    let recommendedAction = "MONITOR";
    let reason = "";

    if (
      stockoutDays !== null &&
      stockoutDays !== undefined &&
      stockoutDays <= 2
    ) {
      urgency = "CRITICAL";
      recommendedAction = "REORDER_NOW";
      reason = `Critical stockout imminent: estimated ${stockoutDays} days remaining at current velocity (${analysis.salesVelocity || 0}/day). Immediate reorder required.`;
    } else if (
      stockoutDays !== null &&
      stockoutDays !== undefined &&
      stockoutDays <= 7
    ) {
      urgency = "HIGH";
      recommendedAction = "REORDER_SOON";
      reason = `Stockout risk detected: stock is projected to deplete in ${stockoutDays} days within warning window. Reorder recommended soon.`;
    } else if (status === "LOW_STOCK") {
      urgency = "MEDIUM";
      recommendedAction = "PLAN_REORDER";
      reason = `Current stock (${analysis.currentStock || 0}) is below threshold (${analysis.reorderThreshold || 0}). Plan replenishment order.`;
    } else {
      urgency = "LOW";
      recommendedAction = "MONITOR";
      reason = `Inventory levels for ${name} are healthy with sufficient runway. Continue normal monitoring.`;
    }

    if (fallbackReason) {
      reason += ` (${fallbackReason})`;
    }

    return {
      urgency,
      recommendedAction,
      reason,
      source: "fallback",
    };
  }

  /**
   * Analyzes inventory risk using Google Gemini AI, with automatic fallback.
   *
   * @param {Object} inventoryAnalysis - Deterministic analysis object from Phase 3
   * @returns {Promise<Object>} Structured recommendation { urgency, recommendedAction, reason, source }
   */
  async analyzeInventoryRisk(inventoryAnalysis) {
    const productName = inventoryAnalysis?.name || "Unknown Product";
    const status = inventoryAnalysis?.status || "UNKNOWN";

    // Safe logging (no secrets or sensitive data)
    console.log(
      `[AI] AI analysis started for product: ${productName} (status: ${status})`,
    );

    // Check if AI is enabled via environment variable (default true if key provided)
    const isAiEnabled = process.env.AI_ENABLED !== "false";
    if (!isAiEnabled) {
      console.log(
        `[AI] AI_ENABLED is false. Using deterministic fallback for ${productName}.`,
      );
      return this.calculateFallback(
        inventoryAnalysis,
        "AI disabled via config",
      );
    }

    const client = this._getClient();
    if (!client) {
      console.log(
        `[AI] GEMINI_API_KEY not configured. Using deterministic fallback for ${productName}.`,
      );
      return this.calculateFallback(
        inventoryAnalysis,
        "GEMINI_API_KEY not set",
      );
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";

    // Prepare prompt payload with deterministic input facts
    const payloadPrompt = `Please analyze the following inventory item and recommend reorder urgency, action, and concise reasoning:
${JSON.stringify(
  {
    name: inventoryAnalysis.name,
    sku: inventoryAnalysis.sku,
    currentStock: inventoryAnalysis.currentStock,
    reorderThreshold: inventoryAnalysis.reorderThreshold,
    totalUnitsSold: inventoryAnalysis.totalUnitsSold,
    analysisDays: inventoryAnalysis.analysisDays,
    salesVelocity: inventoryAnalysis.salesVelocity,
    daysUntilStockout: inventoryAnalysis.daysUntilStockout,
    status: inventoryAnalysis.status,
  },
  null,
  2,
)}`;

    try {
      // Enforce rate limit delay before calling Gemini API
      await this._enforceRequestRateLimit(productName);

      let response = null;
      let lastErr = null;
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          response = await client.models.generateContent({
            model: modelName,
            contents: payloadPrompt,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
              temperature: 0.2, // Low temperature for deterministic, consistent reasoning
            },
          });
          this._lastRequestTime = Date.now();
          break; // Succeeded
        } catch (callErr) {
          lastErr = callErr;
          this._lastRequestTime = Date.now();

          const errMsg = callErr?.message || "";
          const isRateLimit =
            errMsg.includes("429") ||
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("503") ||
            errMsg.includes("UNAVAILABLE");

          const isDailyQuotaExhausted =
            errMsg.includes("quota") && errMsg.includes("limit: 20");

          if (isRateLimit && !isDailyQuotaExhausted && attempt < maxAttempts) {
            const backoffMs = 2000;
            console.warn(
              `[AI] Transient rate limit hit for ${productName} (attempt ${attempt}/${maxAttempts}). Backing off for ${backoffMs}ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          } else {
            throw callErr;
          }
        }
      }

      const rawText = response?.text;
      if (!rawText) {
        throw new Error("Empty response returned from Gemini API");
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error(
          `Failed to parse Gemini JSON output: ${parseErr.message}`,
        );
      }

      // Server-side validation
      const validation = validateAIResponse(parsed);
      if (!validation.isValid) {
        throw new Error(
          `Gemini response failed schema validation: ${validation.error}`,
        );
      }

      console.log(
        `[AI] Gemini analysis completed for ${productName}. Source: gemini.`,
      );
      return {
        ...validation.sanitized,
        source: "gemini",
      };
    } catch (err) {
      this._lastRequestTime = Date.now();
      // Safe error logging (never logs API keys or headers)
      console.error(
        `[AI] Error during Gemini analysis for ${productName}: ${err.message}. Falling back to deterministic rules.`,
      );
      return this.calculateFallback(
        inventoryAnalysis,
        "Deterministic fallback due to AI service error",
      );
    }
  }
}

module.exports = new AIService();
