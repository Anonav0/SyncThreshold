/**
 * inventoryMonitor.js
 *
 * Background cron scheduler module using node-cron.
 * Responsible ONLY for scheduling and triggering the inventory monitoring workflow.
 *
 * Architecture:
 * node-cron -> inventoryMonitor -> inventoryAutomationService -> (inventoryAnalysisService + aiService)
 */

const cron = require("node-cron");
const inventoryAutomationService = require("../services/inventoryAutomationService");

let scheduledTask = null;
let isInitialized = false;

/**
 * Starts the background inventory monitoring cron scheduler.
 * Ensures only a single cron instance is registered per process.
 *
 * @returns {Object|null} The registered cron task or null if disabled
 */
function startInventoryScheduler() {
  const isEnabled = process.env.AUTOMATION_ENABLED !== "false";

  if (!isEnabled) {
    console.log(
      "[Inventory Monitor] Automation is disabled (AUTOMATION_ENABLED=false). Cron scheduler not started.",
    );
    return null;
  }

  if (isInitialized && scheduledTask) {
    console.log(
      "[Inventory Monitor] Scheduler already registered. Skipping duplicate registration.",
    );
    return scheduledTask;
  }

  const cronExpression = process.env.INVENTORY_CHECK_CRON || "*/15 * * * *";

  if (!cron.validate(cronExpression)) {
    console.error(
      `[Inventory Monitor] Invalid cron expression: "${cronExpression}". Defaulting to "*/15 * * * *".`,
    );
  }

  const validCron = cron.validate(cronExpression)
    ? cronExpression
    : "*/15 * * * *";

  scheduledTask = cron.schedule(validCron, async () => {
    try {
      await inventoryAutomationService.runInventoryCheck({ isScheduled: true });
    } catch (err) {
      if (err.isConflict) {
        // Overlapping run was skipped gracefully
        return;
      }
      console.error(
        `[Inventory Monitor] Unhandled error during scheduled check: ${err.message}`,
      );
    }
  });

  isInitialized = true;
  console.log(
    `[Inventory Monitor] Scheduled inventory check started with expression: ${validCron}`,
  );
  return scheduledTask;
}

/**
 * Stops the scheduled cron task if active.
 */
function stopInventoryScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    isInitialized = false;
    console.log("[Inventory Monitor] Scheduled inventory check stopped.");
  }
}

/**
 * Checks if the scheduler is active
 */
function isSchedulerActive() {
  return isInitialized && scheduledTask !== null;
}

module.exports = {
  startInventoryScheduler,
  stopInventoryScheduler,
  isSchedulerActive,
};
