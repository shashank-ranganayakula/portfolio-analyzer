import { config } from "./config.js";

const defaultHeaders = {
  "content-type": "application/json",
  "access-control-allow-origin": config.cors.origin,
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization"
};

export const jsonResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    ...defaultHeaders,
    ...headers
  },
  body: JSON.stringify(body)
});

export const ok = (body) => jsonResponse(200, body);

export const accepted = (body) => jsonResponse(202, body);

export const notFound = (message = "Resource not found") =>
  jsonResponse(404, {
    error: message
  });

export const notImplemented = (serviceName, nextStep) =>
  jsonResponse(501, {
    service: serviceName,
    message: "Handler scaffold is ready. Business logic will be added in a later phase.",
    nextStep
  });

export const errorResponse = (error, statusCode = 500) =>
  jsonResponse(statusCode, {
    error: error?.message ?? "Unexpected error"
  });

