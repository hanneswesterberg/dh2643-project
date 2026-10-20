import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";

const apiUrl = new URL(
  process.env.E2E_API_URL ?? "http://localhost:8000",
).origin;

async function getCsrfToken(api: APIRequestContext): Promise<string> {
  const response = await api.get(`${apiUrl}/api/users/csrf/`);
  expect(response.status()).toBe(200);

  const csrfCookie = (await api.storageState()).cookies.find(
    (cookie) => cookie.name === "csrftoken",
  );
  if (!csrfCookie) {
    throw new Error("Django did not set a CSRF cookie.");
  }
  return csrfCookie.value;
}

async function deleteTestAccount(
  api: APIRequestContext,
  username: string,
  password: string,
): Promise<void> {
  const initialCsrfToken = await getCsrfToken(api);
  const loginResponse = await api.post(`${apiUrl}/api/users/login/`, {
    data: { username, password },
    headers: { "X-CSRFToken": initialCsrfToken },
  });

  if (loginResponse.status() === 401) {
    return;
  }
  expect(loginResponse.status()).toBe(200);

  const csrfToken = await getCsrfToken(api);
  const deleteResponse = await api.delete(`${apiUrl}/api/users/me/`, {
    headers: { "X-CSRFToken": csrfToken },
  });
  expect(deleteResponse.status()).toBe(204);
}

test("signup, login, update a profile, and hand off to test checkout", async ({
  page,
  request,
}) => {
  const unique = randomUUID().replaceAll("-", "").slice(0, 16);
  const username = `e2e-${unique}`;
  const email = `${username}@example.test`;
  const password = `E2e-${randomUUID()}!A9`;
  let registrationAttempted = false;

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in" }).click();
    const signInPanel = page.locator(".sidebar-panel");
    await signInPanel.getByRole("button", { name: "Register a new account" }).click();
    await signInPanel.getByLabel("Username").fill(username);
    await signInPanel.getByLabel("Email").fill(email);
    await signInPanel.getByLabel("Password", { exact: true }).fill(password);
    await signInPanel.getByLabel("Confirm password").fill(password);

    registrationAttempted = true;
    await signInPanel.getByRole("button", { name: "Register" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Account created. You can now sign in.",
    );
    await signInPanel.getByRole("heading", { name: "Sign in" }).waitFor();

    await signInPanel.getByLabel("Username or email").fill(username);
    await signInPanel.getByLabel("Password", { exact: true }).fill(password);
    await signInPanel.getByRole("button", { name: "Login" }).click();
    await expect(page.getByRole("button", { name: username })).toBeVisible();
    await signInPanel.getByRole("link", { name: "Profile Settings", exact: true }).click();
    await expect(page).toHaveURL(/\/profile$/);

    const displayName = `E2E Profile ${unique}`;
    await page.getByLabel("Display Name").fill(displayName);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("status")).toContainText("Profile updated.");
    await expect(page.getByLabel("Display Name")).toHaveValue(displayName);
    await page.reload();
    await expect(page.getByLabel("Display Name")).toHaveValue(displayName);

    const eventsResponse = await page.request.get(`${apiUrl}/api/events/`);
    expect(eventsResponse.status()).toBe(200);
    const eventCollection: unknown = await eventsResponse.json();
    if (
      typeof eventCollection !== "object" ||
      eventCollection === null ||
      !("features" in eventCollection) ||
      !Array.isArray(eventCollection.features)
    ) {
      throw new Error("The events API did not return a GeoJSON feature collection.");
    }
    const configuredEventId = process.env.E2E_TICKET_EVENT_ID
      ? Number(process.env.E2E_TICKET_EVENT_ID)
      : undefined;
    const ticketEvent = eventCollection.features.find(
      (feature: {
        id: number;
        properties: { ticket_url: string };
      }) =>
        typeof feature.properties.ticket_url === "string" &&
        feature.properties.ticket_url.startsWith("https://") &&
        (configuredEventId === undefined || feature.id === configuredEventId),
    );
    expect(
      ticketEvent,
      configuredEventId === undefined
        ? "The test database must include a located event with an HTTPS ticket URL."
        : `E2E_TICKET_EVENT_ID=${configuredEventId} must identify a located event with an HTTPS ticket URL.`,
    ).toBeDefined();
    if (!ticketEvent) {
      throw new Error("No usable test ticket event was found.");
    }

    const csrfToken = await getCsrfToken(page.request);
    const saveResponse = await page.request.post(
      `${apiUrl}/api/users/saved-events/${ticketEvent.id}/`,
      { headers: { "X-CSRFToken": csrfToken } },
    );
    expect(saveResponse.status()).toBe(201);

    await page.goto("/");
    await page.getByRole("button", { name: username }).click();
    await page.getByRole("link", { name: "Your Events" }).click();
    await expect(page).toHaveURL(/\/profile\/events$/);
    const ticketLink = page.getByRole("link", { name: "Get tickets" });
    await expect(ticketLink).toHaveAttribute("href", ticketEvent.properties.ticket_url);
    await expect(ticketLink).toHaveAttribute("target", "_blank");

    await page.context().route(
      (url) => url.toString() === ticketEvent.properties.ticket_url,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><html><body><h1>Test ticket provider</h1></body></html>",
        });
      },
    );
    const checkoutPagePromise = page.waitForEvent("popup");
    await ticketLink.click();
    const checkoutPage = await checkoutPagePromise;
    await expect(
      checkoutPage.getByRole("heading", { name: "Test ticket provider" }),
    ).toBeVisible();
    await checkoutPage.close();
  } finally {
    if (registrationAttempted) {
      await deleteTestAccount(request, username, password);
    }
  }
});
