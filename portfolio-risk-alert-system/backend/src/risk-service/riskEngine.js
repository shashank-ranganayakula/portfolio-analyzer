const ALLOCATION_DRIFT_THRESHOLD = 0.05;
const ALLOCATION_DRIFT_MEDIUM_THRESHOLD = 0.08;
const SINGLE_STOCK_THRESHOLD = 0.2;
const SINGLE_STOCK_HIGH_THRESHOLD = 0.3;
const DAILY_DROP_THRESHOLD = 0.03;

export const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const roundWeight = (value) => Math.round((value + Number.EPSILON) * 10000) / 10000;

export const roundPercent = (value) => Math.round((value + Number.EPSILON) * 10000) / 100;

export const calculatePortfolioValue = ({ portfolio, prices }) => {
  const priceBySymbol = new Map(prices.map((price) => [price.symbol, price.price]));

  const holdings = portfolio.holdings.map((holding) => {
    const price = priceBySymbol.get(holding.symbol) ?? 0;
    const value = holding.quantity * price;

    return {
      ...holding,
      price,
      value: roundMoney(value)
    };
  });

  const portfolioValue = roundMoney(holdings.reduce((total, holding) => total + holding.value, 0));

  return {
    portfolioValue,
    holdings: holdings.map((holding) => {
      const actualWeight = portfolioValue > 0 ? holding.value / portfolioValue : 0;

      return {
        ...holding,
        actualWeight: roundWeight(actualWeight),
        drift: roundWeight(actualWeight - holding.modelWeight)
      };
    })
  };
};

const severityRank = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3
};

export const highestSeverity = (left, right) =>
  severityRank[left] >= severityRank[right] ? left : right;

const toAlertKeyPart = (value) => String(value).replace(/[^A-Za-z0-9-]/g, "-");

export const createAlertId = ({ clientId, riskType, symbol = "PORTFOLIO", createdAt }) => {
  const day = createdAt.slice(0, 10);
  return ["alert", day, clientId, riskType, symbol].map(toAlertKeyPart).join("-");
};

export const detectRiskBreaches = ({ portfolio, prices, now = new Date() }) => {
  const { portfolioValue, holdings } = calculatePortfolioValue({ portfolio, prices });
  const alerts = [];
  const createdAt = now.toISOString();

  const dailyDrop = portfolio.dayStartValue > 0 ? (portfolio.dayStartValue - portfolioValue) / portfolio.dayStartValue : 0;

  if (dailyDrop > DAILY_DROP_THRESHOLD) {
    alerts.push({
      alertId: createAlertId({
        clientId: portfolio.clientId,
        riskType: "DAILY_PORTFOLIO_DROP",
        createdAt
      }),
      clientId: portfolio.clientId,
      riskType: "DAILY_PORTFOLIO_DROP",
      severity: "HIGH",
      portfolioValue,
      details: {
        dayStartValue: roundMoney(portfolio.dayStartValue),
        dropPercent: roundPercent(dailyDrop),
        threshold: DAILY_DROP_THRESHOLD
      },
      createdAt
    });
  }

  for (const holding of holdings) {
    if (holding.actualWeight > SINGLE_STOCK_THRESHOLD) {
      alerts.push({
        alertId: createAlertId({
          clientId: portfolio.clientId,
          riskType: "SINGLE_STOCK_EXPOSURE",
          symbol: holding.symbol,
          createdAt
        }),
        clientId: portfolio.clientId,
        riskType: "SINGLE_STOCK_EXPOSURE",
        severity: holding.actualWeight > SINGLE_STOCK_HIGH_THRESHOLD ? "HIGH" : "MEDIUM",
        portfolioValue,
        details: {
          symbol: holding.symbol,
          actualWeight: holding.actualWeight,
          threshold: SINGLE_STOCK_THRESHOLD
        },
        createdAt
      });
    }

    const drift = Math.abs(holding.drift);

    if (drift > ALLOCATION_DRIFT_THRESHOLD) {
      alerts.push({
        alertId: createAlertId({
          clientId: portfolio.clientId,
          riskType: "ALLOCATION_DRIFT",
          symbol: holding.symbol,
          createdAt
        }),
        clientId: portfolio.clientId,
        riskType: "ALLOCATION_DRIFT",
        severity: drift > ALLOCATION_DRIFT_MEDIUM_THRESHOLD ? "MEDIUM" : "LOW",
        portfolioValue,
        details: {
          symbol: holding.symbol,
          modelWeight: roundWeight(holding.modelWeight),
          actualWeight: holding.actualWeight,
          drift: holding.drift,
          threshold: ALLOCATION_DRIFT_THRESHOLD
        },
        createdAt
      });
    }
  }

  return alerts;
};
