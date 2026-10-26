import express, {
  type ErrorRequestHandler,
  type Express,
} from "express";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

const requestErrorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 500;

  if (status === 413) {
    res.status(413).json({
      error: "This chat request is too large. Shorten it and try again.",
      code: "INVALID_REQUEST",
    });
    return;
  }

  if (status === 400) {
    res.status(400).json({
      error: "The request could not be read. Please check it and try again.",
      code: "INVALID_REQUEST",
    });
    return;
  }

  req.log.error(
    {
      errorName:
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        typeof error.name === "string"
          ? error.name
          : "UnknownError",
    },
    "Unhandled API request error",
  );
  res.status(500).json({
    error: "The request could not be completed. Please try again.",
    code: "UPSTREAM_ERROR",
  });
};

app.use(requestErrorHandler);

export default app;
