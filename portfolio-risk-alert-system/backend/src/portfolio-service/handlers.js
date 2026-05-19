import { createLogger } from "../shared/logger.js";
import { errorResponse, notFound, ok } from "../shared/response.js";
import { computeAllocation } from "./allocation.js";
import { getPortfolioByClientId, getPricesForSymbols, listPortfolioSummaries } from "./repository.js";

const logger = createLogger("portfolio-service");

export const listPortfolios = async () => {
  try {
    logger.info("List portfolios invoked");
    const portfolios = await listPortfolioSummaries();

    return ok({
      count: portfolios.length,
      portfolios
    });
  } catch (error) {
    logger.error("Failed to list portfolios", { error: error.message });
    return errorResponse(error);
  }
};

export const getPortfolio = async (event) => {
  const clientId = event?.pathParameters?.clientId;

  try {
    logger.info("Get portfolio invoked", { clientId });
    const portfolio = await getPortfolioByClientId(clientId);

    if (!portfolio) {
      return notFound(`Portfolio not found for clientId ${clientId}`);
    }

    return ok({ portfolio });
  } catch (error) {
    logger.error("Failed to get portfolio", { clientId, error: error.message });
    return errorResponse(error);
  }
};

export const getAllocation = async (event) => {
  const clientId = event?.pathParameters?.clientId;

  try {
    logger.info("Get allocation invoked", { clientId });
    const portfolio = await getPortfolioByClientId(clientId);

    if (!portfolio) {
      return notFound(`Portfolio not found for clientId ${clientId}`);
    }

    const symbols = portfolio.holdings.map((holding) => holding.symbol);
    const prices = await getPricesForSymbols(symbols);

    return ok({
      allocation: computeAllocation({ portfolio, prices })
    });
  } catch (error) {
    logger.error("Failed to get allocation", { clientId, error: error.message });
    return errorResponse(error);
  }
};
