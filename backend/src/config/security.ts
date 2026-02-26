import helmet from "helmet";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false // SPA loads assets dynamically
});

