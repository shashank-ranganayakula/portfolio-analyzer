import test from "node:test";
import assert from "node:assert/strict";
import { ok } from "../src/shared/response.js";

test("ok returns a JSON API Gateway response", () => {
  const response = ok({ ready: true });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(response.body), { ready: true });
});

