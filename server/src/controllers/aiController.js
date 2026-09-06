/**
 * aiController.js
 *
 * Coordinates inventory risk analysis requests with aiService and inventoryAnalysisService.
 * Does not directly communicate with Gemini SDK — delegates cleanly to aiService.
 */

const inventoryService = require("../services/inventoryService");
const inventoryAnalysisService = require("../services/inventoryAnalysisService");
const aiService = require("../services/aiService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Helper to parse and validate optional ?days= query parameter
 */
const parseDaysParam = (queryDays) => {
  if (queryDays === undefined || queryDays === null || queryDays === "") {
    return undefined;
  }
  const parsed = Number(queryDays);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(
      'Query parameter "days" must be a positive integer greater than 0',
    );
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

/**
 * @desc    Trigger AI risk analysis for a single inventory item
 * @route   POST /api/inventory/:id/ai-analysis
 * @access  Public
 */
const analyzeItemRisk = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const days = parseDaysParam(req.query.days);

  // 1. Verify item exists
  const item = await inventoryService.getItemById(id);
  if (!item) {
    return sendError(res, "Inventory item not found", 404);
  }

  // 2. Run deterministic analysis
  const deterministicData = await inventoryAnalysisService.analyzeItem(id, {
    days,
  });

  // 3. Pass deterministic data to isolated AI service
  const aiResult = await aiService.analyzeInventoryRisk(deterministicData);

  // 4. Return structured response conforming to Phase 4 specification
  return sendSuccess(
    res,
    {
      inventory: {
        id: item._id,
        name: item.name,
        sku: item.sku,
        category: item.category,
      },
      deterministicAnalysis: {
        currentStock: deterministicData.currentStock,
        reorderThreshold: deterministicData.reorderThreshold,
        totalUnitsSold: deterministicData.totalUnitsSold,
        analysisDays: deterministicData.analysisDays,
        salesVelocity: deterministicData.salesVelocity,
        daysUntilStockout: deterministicData.daysUntilStockout,
        status: deterministicData.status,
      },
      aiAnalysis: {
        urgency: aiResult.urgency,
        recommendedAction: aiResult.recommendedAction,
        reason: aiResult.reason,
        source: aiResult.source,
      },
    },
    200,
  );
});

/**
 * @desc    Trigger AI risk analysis for all candidates needing attention (LOW_STOCK or STOCKOUT_RISK)
 *          Excludes HEALTHY items to prevent unnecessary AI token consumption.
 * @route   POST /api/inventory/ai-analysis
 * @access  Public
 */
const analyzeCandidatesRisk = asyncHandler(async (req, res) => {
  const days = parseDaysParam(req.query.days);

  // 1. Run deterministic analysis for all inventory
  const allAnalysis = await inventoryAnalysisService.analyzeAllInventory({
    days,
  });

  // 2. Filter out HEALTHY items — only evaluate candidates needing attention
  const candidates = allAnalysis.filter(
    (item) => item.status === "LOW_STOCK" || item.status === "STOCKOUT_RISK",
  );

  console.log(
    `[AI Batch] Selected ${candidates.length} candidates out of ${allAnalysis.length} total items for AI analysis (healthy items excluded).`,
  );

  // 3. Analyze each candidate sequentially through aiService with pacing
  const delayMs =
    process.env.GEMINI_REQUEST_DELAY_MS !== undefined &&
    !isNaN(Number(process.env.GEMINI_REQUEST_DELAY_MS))
      ? Number(process.env.GEMINI_REQUEST_DELAY_MS)
      : 1500;

  const results = [];
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (i > 0 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const aiResult = await aiService.analyzeInventoryRisk(candidate);
    results.push({
      inventory: {
        id: candidate.inventoryItemId,
        name: candidate.name,
        sku: candidate.sku,
        category: candidate.category,
      },
      deterministicAnalysis: {
        currentStock: candidate.currentStock,
        reorderThreshold: candidate.reorderThreshold,
        totalUnitsSold: candidate.totalUnitsSold,
        analysisDays: candidate.analysisDays,
        salesVelocity: candidate.salesVelocity,
        daysUntilStockout: candidate.daysUntilStockout,
        status: candidate.status,
      },
      aiAnalysis: {
        urgency: aiResult.urgency,
        recommendedAction: aiResult.recommendedAction,
        reason: aiResult.reason,
        source: aiResult.source,
      },
    });
  }

  return sendSuccess(res, results, 200);
});

module.exports = {
  analyzeItemRisk,
  analyzeCandidatesRisk,
};
