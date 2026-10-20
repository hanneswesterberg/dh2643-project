import { defineConfig, devices } from "@playwright/test";

const apiUrl = new URL(
  process.env.E2E_API_URL ?? "http://localhost:8000",
);
const allowedLocalHosts = new Set(["localhost", "127.0.0.1", "::1"]);

if (
  !allowedLocalHosts.has(apiUrl.hostname) &&
  process.env.E2E_ALLOW_REMOTE_API !== "true"
) {
  throw new Error(
    "E2E_API_URL must target localhost unless E2E_ALLOW_REMOTE_API=true is explicitly set.",
  );
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const frontendPort = new URL(baseURL).port || "3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${frontendPort}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: apiUrl.origin,
      BACKEND_INTERNAL_URL: apiUrl.origin,
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
