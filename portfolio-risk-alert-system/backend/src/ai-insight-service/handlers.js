import { createLogger } from "../shared/logger.js";
import { ok } from "../shared/response.js";

const logger = createLogger("ai-insight-service");

export const getInsightsByClient = async (event) => {
  const clientId = event?.pathParameters?.clientId;
  logger.info("Get insights by client placeholder invoked", { clientId });

  return ok({
    clientId,
    insights: [],
    message: "AI insight reads will be implemented after alert generation is complete."
  });
};

export const handleRiskAlert = async (event) => {
  const recordCount = event?.Records?.length ?? 0;
  logger.info("AI insight placeholder invoked", { recordCount });

  return {
    processedRecords: recordCount,
    insightsCreated: 0
  };
};
