/**
 * inventoryAutomationService.js
 *
 * Core orchestrator for automated inventory monitoring.
 * Reuses:
 * - inventoryAnalysisService.js (deterministic sales velocity, days-until-stockout, risk status)
 * - aiService.js (isolated Gemini AI risk evaluations and deterministic fallback)
 *
 * Features:
 * - Single process in-memory lock preventing concurrent / overlapping runs.
 * - Filters out HEALTHY items to prevent wasteful AI token consumption.
 * - Product-level fault tolerance (one failure does not crash the entire audit).
 * - Generates structured Automation Summary (SUCCESS / PARTIAL_SUCCESS / FAILED).
 * - Maintains execution metrics in memory for GET /api/automation/status.
 */

const inventoryAnalysisService = require("./inventoryAnalysisService");
const aiService = require("./aiService");
const alertService = require("./alertService");
const emailService = require("./emailService");
const Alert = require("../models/Alert");

class InventoryAutomationService {
  constructor() {
    this.isRunning = false;
    this.lastRunAt = null;
    this.lastRunStatus = null;
    this.lastRunSummary = null;
  }

  /**
   * Returns current automation and scheduler status
   */
  getStatus() {
    const isEnabled = process.env.AUTOMATION_ENABLED !== "false";
    const schedule = process.env.INVENTORY_CHECK_CRON || "*/15 * * * *";
    const isAiEnabled = process.env.AI_ENABLED !== "false";

    return {
      enabled: isEnabled,
      schedule,
      running: this.isRunning,
      aiEnabled: isAiEnabled,
      lastRunAt: this.lastRunAt,
      lastRunStatus: this.lastRunStatus,
      lastRunSummary: this.lastRunSummary,
    };
  }

  /**
   * Executes the full automated inventory check workflow.
   * Both cron jobs and manual HTTP triggers call this exact method.
   *
   * @param {Object} options
   * @param {number} [options.days] - Sales analysis window in days (default from env or 7)
   * @param {boolean} [options.isScheduled=false] - True if triggered via node-cron
   * @returns {Promise<Object>} Automation execution summary
   */
  async runInventoryCheck(options = {}) {
    const isScheduled = options.isScheduled === true;
    const triggerSource = isScheduled ? "scheduled cron" : "manual trigger";

    // 1. Concurrency Check: Prevent overlapping executions
    if (this.isRunning) {
      console.warn(
        `[Inventory Monitor] Inventory check skipped (${triggerSource}): previous run still in progress.`,
      );
      const error = new Error("Inventory monitoring is already running");
      error.statusCode = 409;
      error.isConflict = true;
      throw error;
    }

    this.isRunning = true;
    const startedAt = new Date().toISOString();
    console.log(
      `[Inventory Monitor] Starting inventory check (${triggerSource}) at ${startedAt}...`,
    );

    let itemsChecked = 0;
    let candidatesFound = 0;
    let aiAnalyses = 0;
    let geminiSuccesses = 0;
    let fallbackAnalyses = 0;
    let alertsCreated = 0;
    let alertsReused = 0;
    let alertsResolved = 0;
    let notificationsSent = 0;
    let notificationFailures = 0;
    let errors = 0;
    const candidateResults = [];

    try {
      // 2. Deterministic Analysis for Catalog
      const days = options.days || Number(process.env.SALES_ANALYSIS_DAYS) || 7;
      const allAnalysis = await inventoryAnalysisService.analyzeAllInventory({
        days,
      });
      itemsChecked = Array.isArray(allAnalysis) ? allAnalysis.length : 0;

      console.log(`[Inventory Monitor] Items checked: ${itemsChecked}`);

      // 3. Filter Candidates: Only LOW_STOCK or STOCKOUT_RISK (exclude HEALTHY)
      const candidates = (Array.isArray(allAnalysis) ? allAnalysis : []).filter(
        (item) =>
          item &&
          (item.status === "LOW_STOCK" || item.status === "STOCKOUT_RISK"),
      );
      candidatesFound = candidates.length;

      console.log(
        `[Inventory Monitor] Candidates needing attention found: ${candidatesFound} (healthy items excluded).`,
      );

      // 4. AI Risk Analysis per Candidate with pacing
      const isAiEnabled = process.env.AI_ENABLED !== "false";
      const delayMs =
        process.env.GEMINI_REQUEST_DELAY_MS !== undefined &&
        !isNaN(Number(process.env.GEMINI_REQUEST_DELAY_MS))
          ? Number(process.env.GEMINI_REQUEST_DELAY_MS)
          : 1500;

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const sku = candidate.sku || "UNKNOWN_SKU";
        const name = candidate.name || "Unknown Item";

        if (i > 0 && isAiEnabled && delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        try {
          let aiResult;

          if (!isAiEnabled) {
            // If AI is disabled via config, compute deterministic fallback without calling Gemini
            aiResult = aiService.calculateFallback(
              candidate,
              "AI disabled via config",
            );
            fallbackAnalyses++;
          } else {
            // Call isolated Gemini AI service
            aiResult = await aiService.analyzeInventoryRisk(candidate);
            if (aiResult.source === "gemini") {
              geminiSuccesses++;
            } else {
              fallbackAnalyses++;
            }
          }

          aiAnalyses++;

          // Phase 6 & 7: Alert Persistence, Duplicate Prevention & Email Notification
          try {
            const alertOutcome = await alertService.createAlertIfNeeded({
              inventoryItemId: candidate.inventoryItemId,
              alertType: candidate.status,
              urgency: aiResult.urgency,
              recommendedAction: aiResult.recommendedAction,
              reason: aiResult.reason,
              source: aiResult.source,
            });

            if (alertOutcome.created) {
              alertsCreated++;
            } else if (alertOutcome.reused) {
              alertsReused++;
            }

            // Phase 7: Dispatch email if alert was newly created, or if active alert was reused but has not yet had an email dispatched
            const shouldSendEmail =
              alertOutcome.created ||
              (alertOutcome.reused && !alertOutcome.alert?.emailSent);

            if (shouldSendEmail) {
              try {
                const emailResult = await emailService.sendInventoryAlertEmail(
                  alertOutcome.alert,
                  candidate,
                  candidate,
                );
                if (emailResult.success) {
                  notificationsSent++;
                  if (alertOutcome.alert?._id) {
                    await Alert.findByIdAndUpdate(alertOutcome.alert._id, {
                      emailSent: true,
                      emailSentAt: new Date(),
                    });
                    if (alertOutcome.alert.emailSent !== undefined) {
                      alertOutcome.alert.emailSent = true;
                      alertOutcome.alert.emailSentAt = new Date();
                    }
                  }
                } else if (!emailResult.disabled) {
                  notificationFailures++;
                }
              } catch (emailErr) {
                notificationFailures++;
                console.error(
                  `[Inventory Monitor] Failed to dispatch email for ${sku}: ${emailErr.message}`,
                );
              }
            }
          } catch (alertErr) {
            console.error(
              `[Inventory Monitor] Alert persistence error for ${sku}: ${alertErr.message}`,
            );
          }

          candidateResults.push({
            inventory: {
              id: candidate.inventoryItemId,
              name,
              sku,
              category: candidate.category,
            },
            deterministicAnalysis: {
              currentStock: candidate.currentStock,
              reorderThreshold: candidate.reorderThreshold,
              salesVelocity: candidate.salesVelocity,
              daysUntilStockout: candidate.daysUntilStockout,
              status: candidate.status,
            },
            aiAnalysis: aiResult,
          });
        } catch (itemErr) {
          // Individual item failure must NOT fail the entire monitoring run
          errors++;
          console.error(
            `[Inventory Monitor] Failed to analyze product ${sku} (${name}): ${itemErr.message}. Continuing with remaining items.`,
          );
        }
      }

      // Phase 6: Resolve obsolete active alerts for items whose risk has cleared
      try {
        const resolution =
          await alertService.resolveObsoleteAlerts(allAnalysis);
        alertsResolved = resolution.resolvedCount;
      } catch (resolveErr) {
        console.error(
          `[Inventory Monitor] Alert resolution error: ${resolveErr.message}`,
        );
      }

      // 5. Determine Overall Automation Status
      let overallStatus = "SUCCESS";
      if (errors > 0) {
        overallStatus =
          geminiSuccesses > 0 || fallbackAnalyses > 0
            ? "PARTIAL_SUCCESS"
            : "FAILED";
      }

      const completedAt = new Date().toISOString();
      const summary = {
        status: overallStatus,
        startedAt,
        completedAt,
        itemsChecked,
        candidatesFound,
        aiAnalyses,
        geminiSuccesses,
        fallbackAnalyses,
        alertsCreated,
        alertsReused,
        alertsResolved,
        notificationsSent,
        notificationFailures,
        errors,
        candidates: candidateResults,
      };

      // 6. Update in-memory state
      this.lastRunAt = completedAt;
      this.lastRunStatus = overallStatus;
      this.lastRunSummary = summary;

      console.log(
        `[Inventory Monitor] Automation completed with status ${overallStatus} in ${
          new Date(completedAt).getTime() - new Date(startedAt).getTime()
        }ms. (Checked: ${itemsChecked}, Candidates: ${candidatesFound}, Gemini: ${geminiSuccesses}, Fallback: ${fallbackAnalyses}, AlertsCreated: ${alertsCreated}, AlertsReused: ${alertsReused}, AlertsResolved: ${alertsResolved}, NotificationsSent: ${notificationsSent}, NotificationFailures: ${notificationFailures}, Errors: ${errors})`,
      );

      return summary;
    } catch (criticalErr) {
      const completedAt = new Date().toISOString();
      this.lastRunAt = completedAt;
      this.lastRunStatus = "FAILED";
      this.lastRunSummary = {
        status: "FAILED",
        startedAt,
        completedAt,
        itemsChecked,
        candidatesFound,
        aiAnalyses,
        geminiSuccesses,
        fallbackAnalyses,
        alertsCreated,
        alertsReused,
        alertsResolved,
        notificationsSent,
        notificationFailures,
        errors: errors + 1,
        errorMessage: criticalErr.message,
      };

      console.error(
        `[Inventory Monitor] Critical failure during inventory check: ${criticalErr.message}`,
      );
      throw criticalErr;
    } finally {
      // Always release process lock
      this.isRunning = false;
    }
  }
}

module.exports = new InventoryAutomationService();
