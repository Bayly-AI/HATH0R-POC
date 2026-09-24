import { defineConfig, devices } from "@playwright/test";

const PORT_CLIENT = Number(process.env.POC_E2E_CLIENT_PORT ?? 5173);
const PORT_API = Number(process.env.POC_API_PORT ?? 3001);
const HOST = "localhost";

export default defineConfig({
  testDir: "test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: `http://${HOST}:${PORT_CLIENT}`,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "npx tsx src/server/main.ts",
      url: `http://${HOST}:${PORT_API}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        POC_API_HOST: HOST,
        POC_API_PORT: String(PORT_API),
      },
    },
    {
      command: `npx vite --host ${HOST} --port ${PORT_CLIENT}`,
      url: `http://${HOST}:${PORT_CLIENT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
