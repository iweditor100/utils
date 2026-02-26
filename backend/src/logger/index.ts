import pino from "pino";

const redactions = [
  "req.headers.cookie",
  "req.headers.authorization",
  "req.body.password",
  "req.body.token",
  "req.cookies",
  "response.headers['set-cookie']"
];

export const logger = pino({
  redact: {
    paths: redactions,
    remove: true
  },
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: { colorize: true }
        }
      : undefined
});

