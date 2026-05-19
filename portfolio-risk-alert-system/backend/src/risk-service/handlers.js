import { createLogger } from "../shared/logger.js";
import { ok } from "../shared/response.js";

const logger = createLogger("risk-service");

export const listAlerts = async () => {
  logger.info("List alerts placeholder invoked");

  return ok({
    alerts: [],
    message: "Risk alert queries will be implemented with DynamoDB reads in a later phase."
  });
};

export const getAlertsByClient = async (event) => {
  const clientId = event?.pathParameters?.clientId;
  logger.info("Get alerts by client placeholder invoked", { clientId });

  return ok({
    clientId,
    alerts: [],
    message: "Client-specific risk alert queries will be implemented in a later phase."
  });
};

export const handlePriceUpdated = async (event) => {
  logger.info("Risk evaluation placeholder invoked", {
    detailType: event?.["detail-type"],
    source: event?.source
  });

  return {
    evaluatedPortfolios: 0,
    alertsCreated: 0
  };
};
