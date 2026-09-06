/**
 * aiResponseValidator.js
 *
 * Validates and sanitizes structured AI risk analysis outputs.
 * Enforces strict constraints on urgency, recommended action, and reason.
 */

const ALLOWED_URGENCIES = Object.freeze(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const ALLOWED_ACTIONS = Object.freeze([
  "MONITOR",
  "PLAN_REORDER",
  "REORDER_SOON",
  "REORDER_NOW",
]);

/**
 * Validates an AI output object.
 *
 * Expected structure:
 * {
 *   "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
 *   "recommendedAction": "MONITOR" | "PLAN_REORDER" | "REORDER_SOON" | "REORDER_NOW",
 *   "reason": "non-empty string"
 * }
 *
 * @param {any} data - Raw response object or string
 * @returns {{ isValid: boolean, error?: string, sanitized?: object }}
 */
function validateAIResponse(data) {
  if (!data || typeof data !== "object") {
    return {
      isValid: false,
      error: "AI response must be a valid non-null object.",
    };
  }

  const { urgency, recommendedAction, reason } = data;

  // Validate urgency
  if (!urgency || typeof urgency !== "string") {
    return {
      isValid: false,
      error: "Missing or invalid 'urgency' field.",
    };
  }

  const normalizedUrgency = urgency.trim().toUpperCase();
  if (!ALLOWED_URGENCIES.includes(normalizedUrgency)) {
    return {
      isValid: false,
      error: `Invalid urgency '${urgency}'. Allowed values: ${ALLOWED_URGENCIES.join(", ")}`,
    };
  }

  // Validate recommendedAction
  if (!recommendedAction || typeof recommendedAction !== "string") {
    return {
      isValid: false,
      error: "Missing or invalid 'recommendedAction' field.",
    };
  }

  const normalizedAction = recommendedAction.trim().toUpperCase();
  if (!ALLOWED_ACTIONS.includes(normalizedAction)) {
    return {
      isValid: false,
      error: `Invalid recommendedAction '${recommendedAction}'. Allowed values: ${ALLOWED_ACTIONS.join(", ")}`,
    };
  }

  // Validate reason
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return {
      isValid: false,
      error: "Field 'reason' must be a non-empty string.",
    };
  }

  return {
    isValid: true,
    sanitized: {
      urgency: normalizedUrgency,
      recommendedAction: normalizedAction,
      reason: reason.trim(),
    },
  };
}

module.exports = {
  validateAIResponse,
  ALLOWED_URGENCIES,
  ALLOWED_ACTIONS,
};
