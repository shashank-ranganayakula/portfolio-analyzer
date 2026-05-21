import { randomUUID } from "node:crypto";
import { config } from "../shared/config.js";
import { publishDomainEvents } from "../shared/eventbridge.js";
import { createLogger } from "../shared/logger.js";
import { errorResponse, ok } from "../shared/response.js";
import { generateInsight, parseRiskAlertMessage } from "./insightGenerator.js";
import { listInsightsByClient, saveInsight } from "./repository.js";

const logger = createLogger("ai-insight-service");

export const getInsightsByClient = async (event) => {
  const clientId = event?.pathParameters?.clientId;

  try {
    logger.info("Get insights by client invoked", { clientId });
    const insights = await listInsightsByClient(clientId);

    return ok({
      clientId,
      count: insights.length,
      insights
    });
  } catch (error) {
    logger.error("Failed to get insights by client", { clientId, error: error.message });
    return errorResponse(error);
  }
};

export const handleRiskAlert = async (event) => {
  const recordCount = event?.Records?.length ?? 0;

  logger.info("AI insight handler invoked", { recordCount });

  const generated = [];

  for (const record of event?.Records ?? []) {
    const alert = parseRiskAlertMessage(record);
    const { insight, provider, fallbackReason } = await generateInsight({
      alert,
      aiConfig: config.ai
    });
    const createdAt = new Date().toISOString();

    const insightRecord = {
      insightId: `insight-${randomUUID()}`,
      alertId: alert.alertId,
      clientId: alert.clientId,
      severity: insight.severity,
      explanation: insight.explanation,
      suggestedAction: insight.suggestedAction,
      disclaimer: insight.disclaimer,
      provider,
      requestedProvider: config.ai.provider,
      ...(fallbackReason ? { fallbackReason } : {}),
      createdAt
    };

    await saveInsight(insightRecord);
    logger.info("AI insight stored", {
      clientId: insightRecord.clientId,
      alertId: insightRecord.alertId,
      provider,
      requestedProvider: config.ai.provider,
      fallbackReason
    });
    generated.push(insightRecord);
  }

  await publishDomainEvents(
    generated.map((insight) => ({
      eventType: "AIInsightGenerated",
      source: "ai-insight-service",
      data: {
        clientId: insight.clientId,
        alertId: insight.alertId,
        severity: insight.severity,
        explanation: insight.explanation,
        suggestedAction: insight.suggestedAction
      }
    }))
  );

  return {
    processedRecords: recordCount,
    insightsCreated: generated.length,
    providers: [...new Set(generated.map((insight) => insight.provider))]
  };
};
