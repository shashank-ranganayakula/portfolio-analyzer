import test from "node:test";
import assert from "node:assert/strict";
import {
  DISCLAIMER,
  createFallbackInsight,
  generateInsight,
  normalizeInsight,
  parseAiJson,
  parseRiskAlertMessage
} from "../src/ai-insight-service/insightGenerator.js";

const alert = {
  alertId: "alert-001",
  clientId: "C001",
  riskType: "SINGLE_STOCK_EXPOSURE",
  severity: "HIGH",
  portfolioValue: 104500,
  details: {
    symbol: "AAPL",
    actualWeight: 0.32,
    threshold: 0.2
  }
};

test("parseRiskAlertMessage extracts alert data from EventBridge SQS body", () => {
  const parsed = parseRiskAlertMessage({
    body: JSON.stringify({
      detail: {
        data: alert
      }
    })
  });

  assert.deepEqual(parsed, alert);
});

test("createFallbackInsight is deterministic and includes disclaimer", () => {
  const insight = createFallbackInsight(alert);

  assert.equal(insight.severity, "HIGH");
  assert.match(insight.explanation, /single-stock exposure/i);
  assert.equal(insight.disclaimer, DISCLAIMER);
});

test("parseAiJson accepts strict JSON and JSON wrapped in extra text", () => {
  assert.equal(parseAiJson('{"severity":"LOW"}').severity, "LOW");
  assert.equal(parseAiJson('Here is JSON: {"severity":"MEDIUM"}').severity, "MEDIUM");
});

test("normalizeInsight preserves required fields and replaces disclaimer", () => {
  const normalized = normalizeInsight(
    {
      severity: "HIGH",
      explanation: "Exposure increased.",
      suggestedAction: "Review the position.",
      disclaimer: "Different text"
    },
    alert
  );

  assert.equal(normalized.severity, "HIGH");
  assert.equal(normalized.disclaimer, DISCLAIMER);
});

test("generateInsight falls back when API key is missing", async () => {
  const result = await generateInsight({
    alert,
    aiConfig: {
      provider: "groq",
      apiKey: "",
      model: "llama-3.1-8b-instant"
    }
  });

  assert.equal(result.provider, "fallback");
  assert.equal(result.fallbackReason, "missing-api-key");
  assert.equal(result.insight.severity, "HIGH");
});

test("generateInsight parses provider JSON response", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              severity: "HIGH",
              explanation: "The position is concentrated.",
              suggestedAction: "Review concentration and rebalance if appropriate.",
              disclaimer: DISCLAIMER
            })
          }
        }
      ]
    })
  });

  const result = await generateInsight({
    alert,
    aiConfig: {
      provider: "groq",
      apiKey: "test-key",
      model: "test-model"
    },
    fetchImpl
  });

  assert.equal(result.provider, "groq");
  assert.equal(result.insight.explanation, "The position is concentrated.");
});

test("generateInsight retries a rate-limited provider response", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;

    if (calls === 1) {
      return {
        ok: false,
        status: 429,
        headers: {
          get: () => "0"
        }
      };
    }

    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                severity: "HIGH",
                explanation: "Groq-generated explanation after retry.",
                suggestedAction: "Review the concentration.",
                disclaimer: DISCLAIMER
              })
            }
          }
        ]
      })
    };
  };

  const result = await generateInsight({
    alert,
    aiConfig: {
      provider: "groq",
      apiKey: "test-key",
      model: "test-model",
      throttleMs: 0,
      maxRetries: 1
    },
    fetchImpl
  });

  assert.equal(calls, 2);
  assert.equal(result.provider, "groq");
  assert.equal(result.insight.explanation, "Groq-generated explanation after retry.");
});

test("generateInsight rethrows persistent rate limits so SQS can retry", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 429,
    headers: {
      get: () => "0"
    }
  });

  await assert.rejects(
    generateInsight({
      alert,
      aiConfig: {
        provider: "groq",
        apiKey: "test-key",
        model: "test-model",
        throttleMs: 0,
        maxRetries: 1
      },
      fetchImpl
    }),
    /status 429/
  );
});
