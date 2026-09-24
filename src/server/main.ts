import cors from "cors";
import express from "express";
import { createApiRouter, type ApiDeps } from "./api/routes.js";

const PORT = Number(process.env.POC_API_PORT ?? 3001);
/** Loopback only by default — do not bind 0.0.0.0. */
const HOST = process.env.POC_API_HOST ?? "localhost";

export type CreateAppOptions = ApiDeps;

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "32kb" }));

  app.use("/api", createApiRouter(options));

  return app;
}

function main() {
  const app = createApp();
  app.listen(PORT, HOST, () => {
    console.info(`hathor-poc adapter listening on http://${HOST}:${PORT}`);
  });
}

const isDirect = process.argv[1]?.includes("main.ts") || process.argv[1]?.includes("main.js");
if (isDirect) {
  main();
}
