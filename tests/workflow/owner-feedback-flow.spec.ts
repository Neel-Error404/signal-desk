import { expect, test } from "@playwright/test";

test("local operator creates, inspects, triages, and reloads a signal", async ({
  page
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      browserErrors.push(
        `${message.text()}${location.url.length > 0 ? ` at ${location.url}` : ""}`
      );
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      browserErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  const feedback = `${testInfo.project.name}: Export loses the selected date range.`;
  await page.goto("/");
  await expect(page.getByText("SignalDesk", { exact: true })).toBeVisible();
  await expect(page.getByText("No authentication or verified identity")).toBeVisible();

  await page.getByRole("textbox", { name: "Customer feedback" }).fill(feedback);
  await page
    .getByLabel(/I acknowledge this content will be stored locally/)
    .check();
  await page.getByRole("button", { name: "Create feedback and signal" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Feedback accepted and one signal created."
  );

  const row = page.locator(".signal-row").filter({ hasText: feedback });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole("heading", { name: "Source and decision history" })).toBeVisible();
  await expect(page.locator(".signal-detail .statement")).toHaveText(feedback);
  await expect(page.locator(".signal-detail dd").nth(1)).not.toBeEmpty();

  await page.getByLabel("State").selectOption("reviewing");
  await page.getByLabel("Local operator label (unverified)").fill("Neel");
  await page.getByLabel("Rationale").fill("Confirm the reporting workflow impact.");
  await page
    .getByLabel(/I acknowledge this persisted triage content/)
    .check();
  await page.getByRole("button", { name: "Append event" }).click();
  await expect(page.getByRole("status")).toContainText("Manual triage event appended.");
  await expect(page.getByText("new to reviewing")).toBeVisible();
  await expect(page.getByText("Confirm the reporting workflow impact.")).toBeVisible();

  await page.reload();
  const reloadedRow = page.locator(".signal-row").filter({ hasText: feedback });
  await expect(reloadedRow).toBeVisible();
  await reloadedRow.click();
  await expect(page.getByText("new to reviewing")).toBeVisible();
  await expect(page.getByText("Confirm the reporting workflow impact.")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(browserErrors).toEqual([]);
});
