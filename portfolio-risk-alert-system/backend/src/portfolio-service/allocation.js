export const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const roundWeight = (value) => Math.round((value + Number.EPSILON) * 10000) / 10000;

export const computeAllocation = ({ portfolio, prices }) => {
  const priceBySymbol = new Map(prices.map((item) => [item.symbol, item]));
  const missingPrices = [];

  const holdings = portfolio.holdings.map((holding) => {
    const priceItem = priceBySymbol.get(holding.symbol);
    const price = priceItem?.price;

    if (typeof price !== "number") {
      missingPrices.push(holding.symbol);
    }

    return {
      ...holding,
      price: price ?? null,
      value: typeof price === "number" ? roundMoney(holding.quantity * price) : 0
    };
  });

  const portfolioValue = roundMoney(holdings.reduce((total, holding) => total + holding.value, 0));

  const allocation = holdings.map((holding) => {
    const actualWeight = portfolioValue > 0 ? holding.value / portfolioValue : 0;
    const drift = actualWeight - holding.modelWeight;

    return {
      symbol: holding.symbol,
      quantity: holding.quantity,
      price: holding.price,
      value: holding.value,
      modelWeight: roundWeight(holding.modelWeight),
      actualWeight: roundWeight(actualWeight),
      drift: roundWeight(drift)
    };
  });

  return {
    clientId: portfolio.clientId,
    clientName: portfolio.clientName,
    dayStartValue: roundMoney(portfolio.dayStartValue),
    portfolioValue,
    missingPrices,
    allocation
  };
};

