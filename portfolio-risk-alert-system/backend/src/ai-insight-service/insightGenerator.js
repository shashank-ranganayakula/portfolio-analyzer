export const DISCLAIMER = "This is an AI-generated educational insight, not financial advice.";

const providerDefaults = {
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.1-8b-instant"
  },
  nvidia: {
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "meta/llama-3.1-8b-instruct"
  }
};

const sleep = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

const getRetryAfterMs = (response, attempt) => {
  const retryAfter = response.headers?.get?.("retry-after");
  const retryAfterSeconds = Number(retryAfter);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1000;
  }

  return Math.min(2000 * 2 ** attempt, 10000);
};

export const parseRiskAlertMessage = (record) => {
  const body = typeof record.body === "string" ? JSON.parse(record.body) : record.body;
  const detail = body.detail ?? body;
  const data = detail.data ?? detail;

  return {
    alertId: data.alertId,
    clientId: data.clientId,
    riskType: data.riskType,
    severity: data.severity,
    portfolioValue: data.portfolioValue,
    details: data.details ?? {}
  };
};

export const createFallbackInsight = (alert) => {
  const symbol = alert.details?.symbol ? ` for ${alert.details.symbol}` : "";
  const severity = alert.severity ?? "MEDIUM";

  const explanationByType = {
    ALLOCATION_DRIFT: `The portfolio has allocation drift${symbol}. The current weight differs from the model allocation beyond the configured threshold.`,
    SINGLE_STOCK_EXPOSURE: `The portfolio has concentrated single-stock exposure${symbol}. The holding is above the configured portfolio weight threshold.`,
    DAILY_PORTFOLIO_DROP: "The portfolio value has fallen more than the configured daily drop threshold compared with its day-start value."
  };

  const actionByType = {
    ALLOCATION_DRIFT: "Review the drift against the model allocation and consider rebalancing if it remains appropriate for the client profile.",
    SINGLE_STOCK_EXPOSURE: "Review the concentrated position and consider reducing exposure or rebalancing toward the model allocation.",
    DAILY_PORTFOLIO_DROP: "Review the drivers of the decline and assess whether the portfolio still matches the intended risk profile."
  };

  return {
    severity,
    explanation: explanationByType[alert.riskType] ?? "The portfolio breached a configured risk threshold.",
    suggestedAction: actionByType[alert.riskType] ?? "Review the alert details before taking any action.",
    disclaimer: DISCLAIMER
  };
};

export const buildInsightPrompt = (alert) => `You are generating an educational wealth-management risk alert explanation.

Return strict JSON only with these fields:
severity, explanation, suggestedAction, disclaimer

Rules:
- Do not include markdown.
- Do not make financial guarantees.
- Do not recommend a trade as certain or required.
- Include this exact disclaimer: "${DISCLAIMER}"
- Use the same severity from the alert.

Alert:
${JSON.stringify(alert, null, 2)}`;

export const parseAiJson = (text) => {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("AI response did not contain JSON");
    }

    return JSON.parse(match[0]);
  }
};

export const normalizeInsight = (candidate, alert) => {
  const fallback = createFallbackInsight(alert);

  return {
    severity: ["LOW", "MEDIUM", "HIGH"].includes(candidate?.severity) ? candidate.severity : fallback.severity,
    explanation:
      typeof candidate?.explanation === "string" && candidate.explanation.trim()
        ? candidate.explanation.trim()
        : fallback.explanation,
    suggestedAction:
      typeof candidate?.suggestedAction === "string" && candidate.suggestedAction.trim()
        ? candidate.suggestedAction.trim()
        : fallback.suggestedAction,
    disclaimer: DISCLAIMER
  };
};

export const callAiProvider = async ({ alert, aiConfig, fetchImpl = fetch }) => {
  const provider = aiConfig.provider === "nvidia" ? "nvidia" : "groq";
  const defaults = providerDefaults[provider];
  const endpoint = aiConfig.apiUrl || defaults.endpoint;
  const model = aiConfig.model || defaults.model;

  if (!aiConfig.apiKey) {
    return {
      insight: createFallbackInsight(alert),
      provider: "fallback",
      fallbackReason: "missing-api-key"
    };
  }

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${aiConfig.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 400,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content: "You produce strict JSON risk explanations for an educational demo. You do not provide financial advice."
        },
        {
          role: "user",
          content: buildInsightPrompt(alert)
        }
      ]
    })
  });

  if (!response.ok) {
    const error = new Error(`AI provider request failed with status ${response.status}`);
    error.status = response.status;
    error.retryAfterMs = getRetryAfterMs(response, 0);
    throw error;
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI provider response did not include message content");
  }

  return {
    insight: normalizeInsight(parseAiJson(content), alert),
    provider
  };
};

export const generateInsight = async ({ alert, aiConfig, fetchImpl = fetch }) => {
  if (!aiConfig.apiKey) {
    return {
      insight: createFallbackInsight(alert),
      provider: "fallback",
      fallbackReason: "missing-api-key"
    };
  }

  const maxRetries = Number.isFinite(aiConfig.maxRetries) ? aiConfig.maxRetries : 2;

  if (aiConfig.throttleMs > 0) {
    await sleep(aiConfig.throttleMs);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await callAiProvider({ alert, aiConfig, fetchImpl });
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        await sleep(error.retryAfterMs ?? Math.min(2000 * 2 ** attempt, 10000));
        continue;
      }

      if (error.status === 429) {
        throw error;
      }

      return {
        insight: createFallbackInsight(alert),
        provider: "fallback",
        fallbackReason: error.message
      };
    }
  }
};
