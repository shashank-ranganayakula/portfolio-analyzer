import { createLogger } from "../shared/logger.js";
import { accepted, errorResponse } from "../shared/response.js";
import { publishDomainEvents } from "../shared/eventbridge.js";
import { getMarketPrices, saveMarketPrices } from "./repository.js";
import { parseSimulationRequest, simulatePriceUpdates } from "./simulator.js";

const logger = createLogger("market-data-service");

export const simulatePrices = async (event) => {
  try {
    const request = parseSimulationRequest(event);
    logger.info("Price simulation invoked", {
      scenario: request.scenario,
      symbolCount: request.symbols.length
    });

    const currentPrices = await getMarketPrices(request.symbols);
    const updates = simulatePriceUpdates({
      currentPrices,
      scenario: request.scenario,
      requestedSymbols: request.symbols
    });

    await saveMarketPrices(updates);

    const events = await publishDomainEvents(
      updates.map((update) => ({
        eventType: "PriceUpdated",
        source: "market-data-service",
        data: {
          symbol: update.symbol,
          price: update.price,
          previousPrice: update.previousPrice,
          changePercent: update.changePercent
        }
      })),
      {
        batchSize: 1,
        delayMs: 750
      }
    );

    return accepted({
      message: "Price simulation completed.",
      scenario: request.scenario,
      updatedPrices: updates.length,
      publishedEvents: events.length,
      prices: updates
    });
  } catch (error) {
    logger.error("Price simulation failed", { error: error.message });

    return errorResponse(error);
  }
};
