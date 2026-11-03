import cors from "cors";

export const createCorsMiddleware = (allowedOrigins: string[]) =>
  cors({
    origin: (origin, callback) => {
      callback(null, origin !== undefined && allowedOrigins.includes(origin));
    },
    credentials: true
  });
