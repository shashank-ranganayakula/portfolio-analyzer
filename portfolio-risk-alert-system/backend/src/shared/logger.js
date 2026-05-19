const write = (level, service, message, context = {}) => {
  const payload = {
    level,
    service,
    message,
    timestamp: new Date().toISOString(),
    ...context
  };

  console[level === "error" ? "error" : "log"](JSON.stringify(payload));
};

export const createLogger = (service) => ({
  info: (message, context) => write("info", service, message, context),
  warn: (message, context) => write("warn", service, message, context),
  error: (message, context) => write("error", service, message, context)
});

