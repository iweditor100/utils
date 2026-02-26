import cors, { CorsOptions } from "cors";
import { env } from "./env";

export const corsOptions: CorsOptions = {
  origin: env.FRONTEND_ORIGIN,
  credentials: true
};

export const corsMiddleware = cors(corsOptions);

