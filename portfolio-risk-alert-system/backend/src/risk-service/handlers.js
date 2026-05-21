import { createLogger } from "../shared/logger.js";
import { errorResponse, ok } from "../shared/response.js";
import { publishDomainEvents } from "../shared/eventbridge.js";
import { detectRiskBreaches } from "./riskEngine.js";
import {
  getPricesForSymbols,
  listPortfoliosHoldingSymbol,
  listRiskAlerts,
  listRiskAlertsByClient,
  saveRiskAlerts
} from "./repository.js";

const logger = createLogger("risk-service");

export const listAlerts = async () => {
  try {
    logger.info("List alerts invoked");
    const alerts = await listRiskAlerts();

    return ok({
      count: alerts.length,
      alerts
    });
  } catch (error) {
    logger.error("Failed to list alerts", { error: error.message });
    return errorResponse(error);
  }
};

export const getAlertsByClient = async (event) => {
  const clientId = event?.pathParameters?.clientId;

  try {
    logger.info("Get alerts by client invoked", { clientId });
    const alerts = await listRiskAlertsByClient(clientId);

    return ok({
      clientId,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    logger.error("Failed to get alerts by client", { clientId, error: error.message });
    return errorResponse(error);
  }
};

export const handlePriceUpdated = async (event) => {
  try {
    const detail = event?.detail ?? event;
    const priceUpdate = detail?.data ?? detail;
    const symbol = priceUpdate?.symbol;

    logger.info("Risk evaluation invoked", {
      detailType: event?.["detail-type"],
      source: event?.source,
      symbol
    });

    if (!symbol) {
      throw new Error("PriceUpdated event is missing data.symbol");
    }

    const portfolios = await listPortfoliosHoldingSymbol(symbol);
    const allAlerts = [];

    for (const portfolio of portfolios) {
      const symbols = portfolio.holdings.map((holding) => holding.symbol);
      const prices = await getPricesForSymbols(symbols);
      const alerts = detectRiskBreaches({ portfolio, prices });

      allAlerts.push(...alerts);
    }

    const createdAlerts = await saveRiskAlerts(allAlerts);

    const events = await publishDomainEvents(
      createdAlerts.map((alert) => ({
        eventType: "RiskThresholdBreached",
        source: "risk-service",
        data: {
          alertId: alert.alertId,
          clientId: alert.clientId,
          riskType: alert.riskType,
          severity: alert.severity,
          portfolioValue: alert.portfolioValue,
          details: alert.details
        }
      }))
    );

    return {
      evaluatedPortfolios: portfolios.length,
      alertsDetected: allAlerts.length,
      alertsCreated: createdAlerts.length,
      duplicateAlertsSkipped: allAlerts.length - createdAlerts.length,
      eventsPublished: events.length
    };
  } catch (error) {
    logger.error("Risk evaluation failed", { error: error.message });
    throw error;
  }
};
